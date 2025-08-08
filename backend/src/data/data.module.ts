import { Module } from '@nestjs/common';
import { DataController } from './data.controller';
// Importarías DataService aquí si lo tuvieras
// import { DataService } from './data.service';

@Module({
  controllers: [DataController],
  // providers: [DataService], // Descomentar si creas un servicio
})
export class DataModule {}