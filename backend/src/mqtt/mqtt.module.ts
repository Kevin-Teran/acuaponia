/**
 * @file mqtt.module.ts
 * @description Módulo para la gestión de MQTT, corrigiendo dependencias circulares.
 * @author Kevin Mariano 
 * @version 2.0.0
 * @since 1.0.0
 */
import { Module, forwardRef } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { ConfigModule } from '@nestjs/config';
import { DataModule } from '../data/data.module'; 

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => DataModule),
  ],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}