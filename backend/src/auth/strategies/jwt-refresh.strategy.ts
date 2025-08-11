import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

/**
 * @class JwtRefreshStrategy
 * @description Estrategia de Passport para validar el token de refresco.
 * Utiliza un secreto diferente al del token de acceso principal.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      // Extrae el token del cuerpo de la solicitud en lugar de la cabecera.
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
    });
  }

  /**
   * @method validate
   * @description Valida el payload del token de refresco y devuelve el usuario.
   */
  async validate(payload: { sub: string; email: string }) {
    const user = await this.usersService.findOneWithRelations(payload.sub);
    if (!user) {
      throw new UnauthorizedException('El token de refresco es inválido o el usuario no existe.');
    }
    return user;
  }
}