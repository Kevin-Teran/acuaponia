import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TanksModule } from './tanks/tanks.module';
import { SensorsModule } from './sensors/sensors.module';
import { SettingsModule } from './settings/settings.module';
import { EventsModule } from './events/events.module';
import { DataModule } from './data/data.module';
import { MqttModule } from './mqtt/mqtt.module';

import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(__dirname, '../../../.env'), 
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    TanksModule,
    SensorsModule,
    DataModule,
    EventsModule,
    SettingsModule,
    MqttModule,
  ],
})
export class AppModule {}