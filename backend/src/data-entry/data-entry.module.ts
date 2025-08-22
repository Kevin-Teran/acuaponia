import { Module } from '@nestjs/common';
import { DataEntryService } from './data-entry.service';
import { DataEntryController } from './data-entry.controller';

/**
 * Módulo de entrada de datos
 * @class DataEntryModule
 * @description Configura el módulo de simulación de sensores para pruebas
 */
@Module({
  controllers: [DataEntryController],
  providers: [DataEntryService],
})
export class DataEntryModule {}