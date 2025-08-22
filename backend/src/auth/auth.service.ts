/**
 * @file auth.service.ts
 * @description Servicio que encapsula la lógica de negocio para la autenticación.
 */
import { Injectable, UnauthorizedException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * @class AuthService
 * @description Centraliza la lógica de autenticación, incluyendo validación de credenciales,
 * estado de usuario, y generación y refresco de tokens JWT.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * @method validateUser
   * @description Valida si un usuario existe y si la contraseña proporcionada es correcta.
   * @param {string} email - El correo electrónico del usuario.
   * @param {string} pass - La contraseña en texto plano para validar.
   * @returns {Promise<Omit<User, 'password'>>} El objeto de usuario sin la contraseña.
   * @throws {UnauthorizedException} Si el usuario no existe o la contraseña no coincide.
   */
  async validateUser(email: string, pass: string): Promise<Omit<User, 'password'>> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    throw new UnauthorizedException('Credenciales incorrectas. Por favor, verifique su correo y contraseña.');
  }

  /**
   * @method login
   * @description Orquesta el proceso de inicio de sesión.
   * @param {string} email - Correo del usuario.
   * @param {string} pass - Contraseña del usuario.
   * @param {boolean} [rememberMe=false] - Si es true, extiende la duración del token de refresco.
   * @returns {Promise<object>} Un objeto con los datos del usuario y los tokens.
   * @throws {ForbiddenException} Si la cuenta del usuario no está activa.
   */
  async login(email: string, pass: string, rememberMe = false) {
    const user = await this.validateUser(email.toLowerCase(), pass);

    if (user.status !== 'ACTIVE') {
      this.logger.warn(`Intento de login de cuenta no activa: ${email} (Estado: ${user.status})`);
      const statusMap = {
        INACTIVE: 'inactiva',
        SUSPENDED: 'suspendida',
      };
      const userStatus = statusMap[user.status] || user.status.toLowerCase();
      throw new ForbiddenException(`Su cuenta se encuentra ${userStatus}. Por favor, contacte a un administrador.`);
    }

    const tokens = await this.generateTokens({ id: user.id, email: user.email, role: user.role }, rememberMe);

    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    } catch (error) {
        this.logger.error(`Error al actualizar lastLogin para ${user.email}:`, error);
    }

    this.logger.log(`Login exitoso para: ${user.email}`);
    
    return {
      user,
      tokens,
    };
  }

  /**
   * @method refreshToken
   * @description Genera un nuevo token de acceso a partir de un token de refresco válido.
   * @param {string} userId - El ID del usuario.
   * @param {string} rt - El token de refresco.
   * @returns {Promise<{accessToken: string}>} Un objeto con el nuevo token de acceso.
   */
  async refreshToken(userId: string, rt: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('El usuario asociado a este token ya no existe.');
    }
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('La cuenta de usuario ya no se encuentra activa.');
    }
    
    const payload = { email: user.email, sub: user.id, role: user.role };
    const newAccessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    });

    return {
      accessToken: newAccessToken,
    };
  }

  /**
   * @method generateTokens
   * @description Genera un par de tokens (acceso y refresco) para un usuario.
   * @private
   * @param {{ id: string, email: string, role: string }} payload - Datos a incluir en el token.
   * @param {boolean} rememberMe - Define la duración del token de refresco.
   * @returns {Promise<{accessToken: string, refreshToken: string}>} Los tokens generados.
   */
  private async generateTokens(payload: { id: string, email: string, role: string }, rememberMe: boolean) {
    const tokenPayload = { sub: payload.id, email: payload.email, role: payload.role };

    const accessTokenExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '15m';
    const refreshTokenExpiresIn = rememberMe
      ? this.configService.get<string>('JWT_REFRESH_EXPIRES_IN_EXTENDED') || '30d'
      : this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(tokenPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: accessTokenExpiresIn,
      }),
      this.jwtService.signAsync(tokenPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTokenExpiresIn,
      }),
    ]);

    return { accessToken, refreshToken };
  }
}