// backend/src/data/data.controller.ts
import { Controller, Post, Body, Get, UseGuards, Query, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DataService } from './data.service';
import { ManualEntryDto } from './dto/manual-entry.dto';
import { EmitterControlDto } from './dto/emitter.dto';
import { User } from '@prisma/client';

/**
 * @controller DataController
 * @description Endpoints para la gestión de datos, incluyendo históricos,
 * inyección manual y simulación.
 */
@Controller('data')
@UseGuards(JwtAuthGuard) // Protege todas las rutas para que requieran un token válido
export class DataController {
  constructor(private readonly dataService: DataService) {}

  /**
   * @route   GET /api/data/historical
   * @desc    Proporciona datos históricos para los gráficos del dashboard.
   * Accesible para cualquier usuario autenticado (ADMIN y USER).
   * @param   {User} user - El usuario autenticado (inyectado por el guard).
   * @param   {string} tankId - El ID del tanque a consultar.
   * @param   {string} startDate - La fecha de inicio del rango.
   * @param   {string} endDate - La fecha de fin del rango.
   * @returns {Promise<{ data: any[] }>} Los datos históricos.
   */
  @Get('historical')
  getHistoricalData(
    @Req() req: { user: User },
    @Query('tankId') tankId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    // Se pasa el usuario actual para una capa extra de validación en el servicio.
    return this.dataService.getHistoricalData(req.user, tankId, startDate, endDate);
  }

  // --- Rutas exclusivas para Administradores ---

  @Post('manual')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  submitManualData(@Body() manualEntryDto: ManualEntryDto) {
    return this.dataService.submitManualEntry(manualEntryDto.entries);
  }

  @Post('emitter/start')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  startEmitters(@Body() emitterControlDto: EmitterControlDto) {
    return this.dataService.startEmitters(emitterControlDto.sensorIds);
  }

  @Post('emitter/stop')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  stopEmitter(@Body() body: { sensorId: string }) {
    return this.dataService.stopEmitter(body.sensorId);
  }

  @Get('emitter/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  getEmitterStatus() {
    return this.dataService.getEmitterStatus();
  }
}