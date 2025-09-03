/**
 * @file auth.service.ts
 * @description Lógica de negocio para la autenticación.
 * Versión final y definitiva que garantiza la correcta estructura de la respuesta del login.
 * @author kevin mariano
 * @version 1.0.0 
 * @since 1.0.0
 */

import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';

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
   * Valida las credenciales del usuario y genera los tokens si son correctas.
   * @param {LoginDto} loginDto - Objeto con email y contraseña.
   * @returns {Promise<{user: Omit<User, 'password'>, accessToken: string, refreshToken: string}>}
   * @throws {UnauthorizedException} Si las credenciales son incorrectas o el usuario está inactivo.
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    this.logger.log(`Iniciando proceso de login para: ${email}`);
    
    const user = await this.usersService.findByEmail(email);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      this.logger.warn(`Login fallido para ${email}: Credenciales incorrectas.`);
      throw new UnauthorizedException('Credenciales incorrectas.');
    }
    
    if (user.status !== 'ACTIVE') {
      this.logger.warn(`Login fallido para ${email}: Cuenta inactiva o suspendida.`);
      throw new UnauthorizedException('Tu cuenta está inactiva o suspendida.');
    }

    this.logger.log(`Usuario ${email} verificado. Generando tokens...`);
    const tokens = await this.getTokens(user.id, user.email, user.role);

    // Actualizamos el último acceso del usuario
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Excluimos la contraseña del objeto de usuario que enviaremos
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userPayload } = user;

    // **LA CORRECCIÓN DEFINITIVA ESTÁ AQUÍ**
    // Creamos el objeto de respuesta final, combinando el usuario y los tokens.
    const responsePayload = {
      user: userPayload,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
    
    this.logger.log(`Login exitoso. Enviando payload al cliente: ${JSON.stringify(responsePayload, null, 2)}`);

    return responsePayload;
  }

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

  // Las funciones forgotPassword y resetPassword se mantienen igual
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
    this.logger.log(`URL de reseteo (simulado): ${resetUrl}`);
    return { message: 'Si tu correo electrónico está en nuestros registros, recibirás un enlace para restablecer tu contraseña.' };
  }

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