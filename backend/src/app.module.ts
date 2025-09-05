/**
 * @file app.module.ts
 * @route backend/src
 * @description Módulo raíz de la aplicación NestJS.
 * @author kevin mariano
 * @version 1.1.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { DataModule } from './data/data.module';
import { MqttModule } from './mqtt/mqtt.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TanksModule } from './tanks/tanks.module';
import { EventsModule } from './events/events.module';
import { PrismaModule } from './prisma/prisma.module';
import { SensorsModule } from './sensors/sensors.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    DataModule,
    MqttModule,
    UsersModule,
    TanksModule,
    PrismaModule,
    EventsModule,
    SensorsModule,
    ReportsModule,
    SettingsModule,
    DashboardModule, 
    AnalyticsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}