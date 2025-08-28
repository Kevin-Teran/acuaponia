/**
 * @file data.controller.ts
 * @description Controlador para endpoints de datos de sensores.
 * @author Kevin Mariano 
 * @version 3.0.0
 * @since 1.0.0
 */
import { Controller, Get, Post, Body, Query, UseGuards, Req, Param } from '@nestjs/common';
import { DataService } from './data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ManualEntryDto } from './dto/manual-entry.dto';
import { GetLatestDataDto } from './dto/get-latest-data.dto';
import { EmitterControlDto } from './dto/emitter.dto';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('Data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('data')
export class DataController {
  constructor(private readonly dataService: DataService) {}

  @Get('latest')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Obtener los últimos datos de un tanque' })
  getLatest(@Query() query: GetLatestDataDto, @Req() req) {
    return this.dataService.getLatest(query, req.user);
  }

  @Get('historical')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Obtener datos históricos de un tanque' })
  getHistoricalData(
    @Req() req,
    @Query('tankId') tankId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.dataService.getHistoricalData(req.user, tankId, startDate, endDate);
  }

  @Post('manual')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Enviar una o más entradas de datos manuales' })
  @ApiBody({ type: [ManualEntryDto] }) // Indica que el cuerpo es un array del DTO
  submitManualEntry(@Body() entries: ManualEntryDto[]) {
    // El cuerpo de la solicitud ahora es un array de ManualEntryDto
    return this.dataService.submitManualEntry(entries);
  }

  @Post('emitter/start')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Iniciar simuladores de sensores' })
  startEmitters(@Body() emitterControlDto: EmitterControlDto) {
    return this.dataService.startEmitters(emitterControlDto.sensorIds);
  }



  @Post('emitter/stop')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Detener un simulador de sensor' })
  stopEmitter(@Body() body: { sensorId: string }) {
    this.dataService.stopEmitter(body.sensorId);
    return { message: `Solicitud para detener el emisor del sensor ${body.sensorId} enviada.` };
  }

  @Get('emitter/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtener el estado de los simuladores activos' })
  getEmitterStatus() {
    return this.dataService.getEmitterStatus();
  }
}