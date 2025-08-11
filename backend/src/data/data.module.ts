import { Module } from '@nestjs/common';
import { DataService } from './data.service';
import { DataController } from './data.controller';
import { EventsModule } from '../events/events.module'; 

/**
 * @module DataModule
 * @description Módulo encargado de la inyección manual y simulación de datos de sensores.
 * Provee el DataController para la gestión de rutas y el DataService para la lógica de negocio.
 * Es un módulo de acceso restringido, solo para administradores.
 */
@Module({
  imports: [EventsModule],
  controllers: [DataController],
  providers: [DataService],
})
export class DataModule {}