import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

/**
 * Estrategia JWT para Passport
 * @class JwtStrategy
 * @extends PassportStrategy
 * @description Valida tokens JWT y extrae información del usuario
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Constructor de la estrategia JWT
   * @param {ConfigService} configService - Servicio de configuración
   * @param {UsersService} usersService - Servicio de usuarios
   */
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'acuaponia-secret-key',
    });
  }

  /**
   * Valida el payload del JWT y retorna el usuario
   * @async
   * @param {any} payload - Payload del JWT
   * @returns {Promise<any>} Usuario validado
   * @example
   * // Automáticamente llamado por Passport cuando se valida un JWT
   * const user = await jwtStrategy.validate(payload);
   */
  async validate(payload: any) {
    const user = await this.usersService.findById(payload.sub);
    return user;
  }
}