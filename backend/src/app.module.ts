import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TanksModule } from './tanks/tanks.module';
import { SensorsModule } from './sensors/sensors.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ReportsModule } from './reports/reports.module';
import { PredictionsModule } from './predictions/predictions.module';
import { AiAssistantModule } from './ai-assistant/ai-assistant.module';
import { DataEntryModule } from './data-entry/data-entry.module';

/**
 * Módulo principal de la aplicación
 * @class AppModule
 * @description Configura todos los módulos y la conexión a la base de datos
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      username: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'acuaponia',
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    AuthModule,
    UsersModule,
    TanksModule,
    SensorsModule,
    DashboardModule,
    AnalyticsModule,
    ReportsModule,
    PredictionsModule,
    AiAssistantModule,
    DataEntryModule,
  ],
})
export class AppModule {}