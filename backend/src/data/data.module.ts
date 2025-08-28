/**
 * @file data.module.ts
 * @description Módulo de datos sin cambios en BD
 * @author Kevin Mariano
 * @version 2.0.0
 * @since 1.0.0
 */
import { Module } from '@nestjs/common';
import { DataService } from './data.service';
import { DataController } from './data.controller';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [DataController],
  providers: [DataService],
  exports: [DataService],
})
export class DataModule {}