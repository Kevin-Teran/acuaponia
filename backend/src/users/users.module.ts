/**
 * @file users.module.ts
 * @description Módulo que agrupa todos los componentes relacionados con la gestión de usuarios.
 * Exporta UsersService para que otros módulos, como AuthModule, puedan utilizarlo.
 * @version 1.0.0
 */
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService], 
})
export class UsersModule {}