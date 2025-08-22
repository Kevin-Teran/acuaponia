import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { TanksModule } from '../tanks/tanks.module';
import { SensorsModule } from '../sensors/sensors.module';

/**
 * Módulo del dashboard
 * @class DashboardModule
 * @description Configura el módulo del dashboard principal
 */
@Module({
  imports: [TanksModule, SensorsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}