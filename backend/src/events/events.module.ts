/**
 * @file events.module.ts
 * @route 
 * @description 
 * @author Kevin Mariano (Actualizado por Gemini)
 * @version 1.1.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Module({
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}