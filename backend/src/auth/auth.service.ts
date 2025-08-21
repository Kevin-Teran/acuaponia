/**
 * @file auth.service.ts
 * @description Contiene la lógica de negocio para la autenticación: validar usuarios y generar tokens.
 * @version 2.0.0
 */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any, rememberMe: boolean = false) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    const expiresIn = rememberMe ? '7d' : '1h';

    return {
      access_token: this.jwtService.sign(payload, { expiresIn }),
    };
  }
}