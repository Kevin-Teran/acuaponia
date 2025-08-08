import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';
import { ConfigService } from '@nestjs/config';

/**
 * @class JwtStrategy
 * @description Estrategia de PassportJS para validar el token JWT en cada petición protegida.
 * Se encarga de extraer el token, verificar su firma y expiración, y adjuntar el
 * usuario a la petición si el token es válido.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * @method validate
   * @description Este método se ejecuta automáticamente por PassportJS después de verificar el token.
   * Busca al usuario en la base de datos a partir del ID (sub) contenido en el payload del token.
   * @param {object} payload - El contenido decodificado del token JWT.
   * @returns {Promise<User>} El objeto de usuario completo que se adjuntará a `req.user`.
   * @throws {UnauthorizedException} Si el usuario asociado al token ya no existe.
   */
  async validate(payload: { sub: string; email: string }) {
    // CORRECCIÓN: Usamos 'findOneWithRelations' que es el método correcto en el servicio.
    const user = await this.usersService.findOneWithRelations(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException('El token es válido, pero el usuario ya no existe.');
    }
    
    // El objeto que se devuelve aquí es el que se inyecta en `req.user` en todos los controladores.
    return user;
  }
}