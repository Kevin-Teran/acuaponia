/**
 * @file reports.module.ts
 * @route 
 * @description 
 * @author Kevin Mariano 
 * @version 1.0.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { EventsModule } from '../events/events.module'; 

@Module({
  imports: [EventsModule], 
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}