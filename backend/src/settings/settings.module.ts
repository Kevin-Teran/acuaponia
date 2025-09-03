/**
 * @file settings.module.ts
 * @route 
 * @description Módulo para la gestión de configuraciones.
 * @author Kevin Mariano
 * @version 1.1.0
 * @copyright SENA 2025
 */
 import { Module } from '@nestjs/common';
 import { SettingsService } from './settings.service';
 import { SettingsController } from './settings.controller';
 import { PrismaModule } from '../prisma/prisma.module';
 
 @Module({
   imports: [PrismaModule],
   controllers: [SettingsController],
   providers: [SettingsService],
   exports: [SettingsService],
 })
 export class SettingsModule {}