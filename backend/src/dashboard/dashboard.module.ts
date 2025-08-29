/**
 * @file dashboard.module.ts
 * @description Módulo para el Dashboard.
 * @author Kevin Mariano
 * @version 3.0.0
 */
import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { DataModule } from '../data/data.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [DataModule, SettingsModule], 
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}