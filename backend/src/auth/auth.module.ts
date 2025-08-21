/**
 * @file auth.module.ts
 * @description Módulo que agrupa toda la lógica de autenticación y autorización.
 * @version 2.1.0
 */
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LocalStrategy } from './strategies/local.strategy'; 
import { JwtStrategy } from './strategies/jwt.strategy';   

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  providers: [
    AuthService,
    LocalStrategy, 
    JwtStrategy,   
  ],
  controllers: [AuthController],
})
export class AuthModule {}