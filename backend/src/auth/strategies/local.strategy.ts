import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

/**
 * Estrategia local para Passport
 * @class LocalStrategy
 * @extends PassportStrategy
 * @description Valida credenciales de usuario (email/password)
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  /**
   * Constructor de la estrategia local
   * @param {AuthService} authService - Servicio de autenticación
   */
  constructor(private readonly authService: AuthService) {
    super({
      usernameField: 'email',
      passwordField: 'password',
    });
  }

  /**
   * Valida las credenciales del usuario
   * @async
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<any>} Usuario validado
   * @throws {UnauthorizedException} Si las credenciales son inválidas
   * @example
   * // Automáticamente llamado por Passport durante el login
   * const user = await localStrategy.validate('user@example.com', 'password123');
   */
  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return user;
  }
}