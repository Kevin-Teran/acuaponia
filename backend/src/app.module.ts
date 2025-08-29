/**
 * @file app.module.ts
 * @description Módulo raíz de la aplicación NestJS.
 * @author kevin mariano
 * @version 1.1.0
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TanksModule } from './tanks/tanks.module';
import { SensorsModule } from './sensors/sensors.module';
import { SettingsModule } from './settings/settings.module';
import { ReportsModule } from './reports/reports.module';
import { EventsModule } from './events/events.module';
import { DataModule } from './data/data.module';
import { MqttModule } from './mqtt/mqtt.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TanksModule,
    SensorsModule,
    ReportsModule,
    DataModule,
    EventsModule,
    SettingsModule,
    MqttModule,
    DashboardModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}