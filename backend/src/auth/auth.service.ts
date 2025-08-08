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
}