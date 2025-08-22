import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

/**
 * Módulo de reportes
 * @class ReportsModule
 * @description Configura el módulo de generación de reportes
 */
@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}