/**
 * @file ai-assistant.module.ts
 * @route backend/src/ai-assistant
 * @description 
 * @author kevin mariano & Deiner
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Module } from '@nestjs/common';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { PrismaModule } from '../prisma/prisma.module'; 
import { AnalyticsModule } from '../analytics/analytics.module';
import { ReportModule } from '../reports/reports.module';
import { AlertsModule } from '../alerts/alerts.module';
import { TanksModule } from '../tanks/tanks.module';
import { SensorsModule } from '../sensors/sensors.module';

@Module({
  imports: [
    PrismaModule,
    AnalyticsModule,
    ReportModule,
    AlertsModule,
    TanksModule,
    SensorsModule
  ],
  controllers: [AiAssistantController],
  providers: [AiAssistantService],
})

export class AiAssistantModule {}