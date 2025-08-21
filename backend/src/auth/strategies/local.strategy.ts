/**
 * @file local.strategy.ts
 * @description Estrategia de Passport para validar las credenciales (email y contraseña) del usuario.
 * @version 1.0.0
 */
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas. Por favor, verifica tu email y contraseña.');
    }
    return user;
  }
}