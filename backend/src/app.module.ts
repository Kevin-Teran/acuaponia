/**
 * @file app.module.ts
 * @description El módulo raíz de la aplicación. Es el punto de partida que une todos los demás módulos.
 * @version 1.0.0
 */
 import { Module } from '@nestjs/common';
 import { ConfigModule } from '@nestjs/config';
 import { AuthModule } from './auth/auth.module';
 import { UsersModule } from './users/users.module';
 import { PrismaModule } from './prisma/prisma.module';
 import * as path from 'path';

 @Module({
   imports: [
     ConfigModule.forRoot({
       isGlobal: true,
       envFilePath: path.resolve(__dirname, '../../.env'),
     }),
     PrismaModule,
     UsersModule,
     AuthModule,
   ],
   controllers: [],
   providers: [],  
 })
 export class AppModule {}