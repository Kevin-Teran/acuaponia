/**
 * @file events.module.ts
 * @route /backend/src/events
 * @description Módulo para el gateway de WebSockets.
 * @author Kevin Mariano 
 * @version 1.1.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { AuthModule } from 'src/auth/auth.module'; 
import { WsJwtGuard } from 'src/auth/guards/ws-jwt.guard';

@Module({
  imports: [AuthModule],
  providers: [EventsGateway, WsJwtGuard],
  exports: [EventsGateway],
})
export class EventsModule {}
