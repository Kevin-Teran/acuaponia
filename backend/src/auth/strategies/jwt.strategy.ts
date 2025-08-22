/**
 * @file jwt.strategy.ts
 * @description Estrategia JWT mejorada para la autenticación con Passport.
 * Valida y extrae información del token JWT para autenticar usuarios.
 * @author Sistema de Acuaponía SENA
 * @version 2.0.0
 * @since 1.0.0
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

/**
 * @typedef {object} JwtPayload
 * @property {string} sub - El ID del usuario (subject).
 * @property {string} email - El email del usuario.
 * @property {string} role - El rol del usuario.
 */

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * @param {ConfigService} configService - Servicio para acceder a variables de entorno.
   * @param {UsersService} usersService - Servicio para interactuar con los datos de usuarios.
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Valida el payload del token y devuelve el usuario si es válido.
   * Este método es invocado por Passport después de verificar la firma del JWT.
   * @param {JwtPayload} payload - El payload decodificado del token JWT.
   * @returns {Promise<Omit<User, 'password'>>} El objeto de usuario sin la contraseña.
   * @throws {UnauthorizedException} Si el usuario no se encuentra o está inactivo.
   * @example
   * const user = await validate({ sub: 'user-id', email: 'test@example.com', role: 'ADMIN' });
   */
  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.usersService.findOne(payload.sub);
    
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Acceso denegado. El usuario no es válido o está inactivo.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result; 
  }
}