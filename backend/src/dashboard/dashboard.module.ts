/**
 * @file src/dashboard/dashboard.module.ts
 * @description Módulo de NestJS para el Dashboard.
 * @author Tu Nombre
 * @version 1.1.0
 * @since 1.0.0
 */

import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { UsersModule } from '../users/users.module';
import { TanksAndSensorsModule } from '../tanks-and-sensors/tanks-and-sensors.module'; 
import { DataEntryModule } from '../data-entry/data-entry.module'; 

@Module({
  imports: [
    // Se importan los módulos necesarios desde la nueva ruta raíz.
    UsersModule,
    TanksAndSensorsModule,
    DataEntryModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}