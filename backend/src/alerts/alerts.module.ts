/**
 * @file alerts.module.ts
 * @route backend/src/alerts
 * @description 
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Module } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [PrismaModule, EmailModule, EventsModule],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}