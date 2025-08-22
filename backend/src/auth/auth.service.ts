/**
 * @file auth.service.ts
 * @description Lógica de negocio para la autenticación, incluyendo login y recuperación de contraseña.
 * @author Sistema de Acuaponía SENA
 * @version 2.1.0
 * @since 1.0.0
 */

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Valida las credenciales del usuario y genera los tokens si son correctas.
   * @param {LoginDto} loginDto - Objeto con email y contraseña.
   * @returns {Promise<{user: Omit<User, 'password'>, accessToken: string, refreshToken: string}>}
   * @throws {UnauthorizedException} Si las credenciales son incorrectas o el usuario está inactivo.
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.usersService.findByEmail(email);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }
    
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Tu cuenta está inactiva o suspendida.');
    }

    const { password: _, ...userPayload } = user;
    const tokens = await this.getTokens(user.id, user.email, user.role);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return { user: userPayload, ...tokens };
  }

  /**
   * Genera un par de tokens (acceso y refresco).
   * @private
   * @param {string} userId - El ID del usuario.
   * @param {string} email - El email del usuario.
   * @param {Role} role - El rol del usuario.
   * @returns {Promise<{accessToken: string, refreshToken: string}>}
   */
  private async getTokens(userId: string, email: string, role: Role) {
    const payload = { sub: userId, email, role };
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Procesa la solicitud de recuperación de contraseña generando un JWT temporal.
   * @param {string} email - El email del usuario.
   * @returns {Promise<{ message: string }>}
   */
  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      return { message: 'Si tu correo electrónico está en nuestros registros, recibirás un enlace para restablecer tu contraseña.' };
    }

    const payload = { sub: user.id, purpose: 'password-reset' };
    const resetToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'), 
      expiresIn: '15m', 
    });

    const resetUrl = `${this.configService.get<string>('FRONTEND_URL')}/reset-password/${resetToken}`;
    console.log(`URL de reseteo (simulado): ${resetUrl}`);
    
    return { message: 'Si tu correo electrónico está en nuestros registros, recibirás un enlace para restablecer tu contraseña.' };
  }

  /**
   * Restablece la contraseña del usuario validando el JWT temporal.
   * @param {string} token - El token JWT de reseteo.
   * @param {string} newPassword - La nueva contraseña.
   * @returns {Promise<{ message: string }>}
   * @throws {BadRequestException} Si el token es inválido o ha expirado.
   */
  async resetPassword(token: string, newPassword: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.purpose !== 'password-reset') {
        throw new Error('Token inválido.');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { password: hashedPassword },
      });
      
      return { message: 'Contraseña actualizada correctamente.' };
    } catch (error) {
      throw new BadRequestException('El token es inválido o ha expirado.');
    }
  }
}