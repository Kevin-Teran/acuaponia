import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { logger } from '../utils/logger';

/**
 * @class AuthService
 * @description Servicio que centraliza toda la lógica de autenticación, incluyendo validación
 * de credenciales, estado de usuario y generación de tokens JWT.
 */
@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * @method validateUser
   * @description Comprueba si un usuario existe y si la contraseña coincide.
   * Utiliza bcrypt para comparar de forma segura la contraseña proporcionada con el hash almacenado.
   * @param {string} email - El correo electrónico del usuario.
   * @param {string} pass - La contraseña en texto plano a validar.
   * @returns {Promise<User | null>} El objeto de usuario completo si es válido, o null si no lo es.
   */
  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    return null;
  }

  /**
   * @method login
   * @description Orquesta el proceso de inicio de sesión completo.
   * 1. Valida que el correo y la contraseña sean correctos.
   * 2. Verifica que la cuenta del usuario esté activa.
   * 3. Genera un token de acceso y un token de refresco con expiraciones configurables.
   * 4. Actualiza la fecha del último inicio de sesión del usuario.
   * 5. Devuelve los datos del usuario (sin contraseña) y los tokens.
   * @param {string} email - El correo del usuario.
   * @param {string} pass - La contraseña del usuario.
   * @param {boolean} [rememberMe=false] - Si es true, extiende la duración del token de refresco.
   * @returns {Promise<object>} Un objeto con los datos del usuario y los tokens.
   * @throws {UnauthorizedException} Si las credenciales son incorrectas.
   * @throws {ForbiddenException} Si la cuenta del usuario no está activa.
   */
  async login(email: string, pass: string, rememberMe = false) {
    const user = await this.validateUser(email, pass);

    if (!user) {
      logger.warn(`Intento de login fallido para: ${email}`);
      throw new UnauthorizedException('Correo o contraseña incorrectos. Por favor, revise sus credenciales.');
    }

    if (user.status !== 'ACTIVE') {
      logger.warn(`Intento de login de cuenta inactiva: ${email} (Estado: ${user.status})`);
      const statusMap = {
        INACTIVE: 'Inactiva',
        SUSPENDED: 'Suspendida',
      };
      const userStatus = statusMap[user.status] || user.status;
      throw new ForbiddenException(`Su cuenta se encuentra ${userStatus}. Por favor, contacte a un administrador.`);
    }

    const payload = { email: user.email, sub: user.id, role: user.role };
    const accessTokenExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '1h';
    const refreshTokenExpiresIn = rememberMe
      ? this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d'
      : accessTokenExpiresIn;

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: accessTokenExpiresIn,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshTokenExpiresIn,
    });

    this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    }).catch(err => logger.error(`Error al actualizar lastLogin para ${user.email}:`, err));

    logger.info(`Login exitoso para: ${user.email}`);

    // Excluimos la contraseña del objeto de usuario que se devuelve al cliente.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userResult } = user;

    return {
      user: userResult,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * @method refreshToken
   * @description Genera un nuevo token de acceso a partir de un token de refresco válido.
   * @param {User} user - El objeto de usuario extraído del token de refresco validado.
   * @returns {Promise<{accessToken: string}>} Un objeto con el nuevo token de acceso.
   */
  async refreshToken(user: User) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const newAccessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '1h',
    });

    return {
      accessToken: newAccessToken,
    };
  }
}