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