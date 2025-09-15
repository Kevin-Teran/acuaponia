/**
 * @file reports.module.ts
 * @route backend/src/reports
 * @description 
 * @author Kevin Mariano 
 * @version 1.0.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */

 import { Module } from '@nestjs/common';
 import { ReportsService } from './reports.service';
 import { ReportsController } from './reports.controller';
 import { PrismaModule } from 'src/prisma/prisma.module';
 import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})

export class ReportsModule {}