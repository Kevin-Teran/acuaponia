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