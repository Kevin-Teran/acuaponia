/**
 * @file settings.module.ts
 * @description Módulo para la gestión de configuraciones.
 * @author Kevin Mariano
 * @version 3.1.0
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