import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Valida las credenciales del usuario y genera los tokens si son correctas.
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userPayload } = user;
    const tokens = await this.getTokens(user.id, user.email);

    return {
      user: userPayload,
      ...tokens,
    };
  }

  /**
   * Refresca los tokens usando un refresh token válido.
   */
  async refreshToken(userId: string, rt: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) throw new UnauthorizedException('Acceso denegado.');
    return this.getTokens(user.id, user.email);
  }

  /**
   * Genera un par de tokens (acceso y refresco).
   */
  async getTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
        },
      ),
      this.jwtService.signAsync(
        { sub: userId, email },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}