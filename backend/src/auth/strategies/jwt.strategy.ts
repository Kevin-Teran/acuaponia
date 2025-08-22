/**
 * @file jwt.strategy.ts
 * @description Estrategia de Passport.js para validar tokens de acceso JWT.
 * Se encarga de extraer el token de la cabecera de autorización, verificar su firma
 * y extraer el payload del usuario para adjuntarlo a la petición.
 * @author kevin mariano
 * @version 2.0.0
 * @since 1.0.0
 */

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { User } from '@prisma/client';

/**
 * @class JwtStrategy
 * @description Implementa la lógica de validación de tokens JWT para proteger rutas.
 * @extends {PassportStrategy(Strategy)}
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * @constructor
   * @param {ConfigService} configService - Servicio para acceder a variables de entorno.
   * @param {UsersService} usersService - Servicio para interactuar con la base de datos de usuarios.
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
   * @function validate
   * @description Método que se ejecuta después de que el token es decodificado y verificado con éxito.
   * @param {any} payload - El payload decodificado del JWT (generalmente { sub: userId, email: userEmail }).
   * @returns {Promise<User>} El objeto de usuario completo que se adjuntará a `request.user`.
   * @throws {UnauthorizedException} Si el usuario extraído del payload ya no existe.
   */
  async validate(payload: any): Promise<User> {
    const user = await this.usersService.findOne(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Token inválido: el usuario no fue encontrado.');
    }

    return user;
  }
}