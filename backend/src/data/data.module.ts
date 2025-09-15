/**
 * @file data.module.ts
 * @route /backend/src/data
 * @description Módulo para la gestión de datos, corrigiendo dependencias circulares.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */
 import { Module, forwardRef } from '@nestjs/common';
 import { DataService } from './data.service';
 import { DataController } from './data.controller';
 import { PrismaModule } from '../prisma/prisma.module';
 import { EventsModule } from '../events/events.module';
 import { MqttModule } from '../mqtt/mqtt.module';
 
 @Module({
   imports: [
     PrismaModule,
     EventsModule,
     forwardRef(() => MqttModule),
   ],
   controllers: [DataController],
   providers: [DataService],
   exports: [DataService],
 })
 export class DataModule {}