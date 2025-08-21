/**
 * @file prisma.module.ts
 * @description Módulo que encapsula y exporta el PrismaService.
 * Al ser un módulo global, PrismaService está disponible en toda la aplicación sin
 * necesidad de importar PrismaModule en cada módulo que lo necesite.
 * @version 1.0.0
 */
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() 
@Module({
  providers: [PrismaService],
  exports: [PrismaService], 
})
export class PrismaModule {}