/**
 * @file prisma.module.ts
 * @route 
 * @description 
 * @author Kevin Mariano 
 * @version 1.0.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * @module PrismaModule
 * @description Módulo que provee el PrismaService de forma global para toda la aplicación.
 * El decorador @Global() hace que no necesites importar este módulo en otros módulos.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}