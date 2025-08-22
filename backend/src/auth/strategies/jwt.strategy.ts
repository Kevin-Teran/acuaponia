import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { UsersService } from '../../users/users.service';

/**
 * @function cookieExtractor
 * @description Extrae el token JWT de la cookie 'access_token' de la petición.
 */
const cookieExtractor = (req: Request): string | null => {
  if (req && req.cookies) {
    return req.cookies['access_token'] || null;
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: cookieExtractor, 
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * @method validate
   * @description Valida el payload del token y devuelve el usuario.
   * Este objeto se adjuntará a `req.user`.
   */
  async validate(payload: { sub: string; email: string; role: string }) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Token inválido');
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}