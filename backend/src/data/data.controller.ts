import { Controller, Post, Body, Get, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DataService } from './data.service';
import { ManualEntryDto } from './dto/manual-entry.dto';
import { EmitterControlDto } from './dto/emitter.dto';

/**
 * @controller DataController
 * @description Endpoints exclusivos para administradores para la inyección y simulación de datos.
 */
@Controller('data')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Post('manual')
  submitManualData(@Body() manualEntryDto: ManualEntryDto) {
    return this.dataService.submitManualEntry(manualEntryDto.entries);
  }

  @Post('emitter/start')
  startEmitters(@Body() emitterControlDto: EmitterControlDto) {
    return this.dataService.startEmitters(emitterControlDto.sensorIds);
  }

  @Post('emitter/stop')
  stopEmitter(@Body() emitterControlDto: { sensorId: string }) {
    return this.dataService.stopEmitter(emitterControlDto.sensorId);
  }

  @Get('emitter/status')
  getEmitterStatus() {
    return this.dataService.getEmitterStatus();
  }
}