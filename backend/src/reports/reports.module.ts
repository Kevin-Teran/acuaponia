/**
 * @file report.module.ts
 * @route /backend/src/reports
 * @description Módulo de reportes con soporte para cron jobs
 * @author Kevin Mariano
 * @version 1.0.1
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportService } from './reports.service';
import { ReportController } from './reports.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}