/**
 * @file sensors.controller.ts
 * @description Controlador para manejar las rutas relacionadas con los sensores.
 * @author kevin mariano
 * @version 2.0.0
 * @since 1.0.0
 */

import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Query, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiBearerAuth()
@ApiTags('Sensors')
@Controller('sensors')
@UseGuards(JwtAuthGuard)
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo sensor' })
  create(@Body() createSensorDto: CreateSensorDto) {
    return this.sensorsService.create(createSensorDto);
  }

  // --- ENDPOINT MODIFICADO PARA SOLUCIONAR EL ERROR 400 ---
  @Get()
  @ApiOperation({ summary: 'Obtener sensores, opcionalmente filtrados por tanque' })
  @ApiQuery({ name: 'tankId', required: false, description: 'ID del tanque para filtrar sensores', type: 'string' })
  findAll(@Query('tankId') tankId?: string) {
    // El servicio ya maneja el caso donde tankId es opcional.
    return this.sensorsService.findAll(tankId);
  }

  @Get('all')
  @ApiOperation({ summary: 'Obtener todos los sensores del sistema' })
  @ApiResponse({ status: 200, description: 'Lista de todos los sensores del sistema.'})
  findAllSystemSensors() {
    return this.sensorsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un sensor por su ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.sensorsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un sensor existente' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() updateSensorDto: UpdateSensorDto) {
    return this.sensorsService.update(id, updateSensorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un sensor' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.sensorsService.remove(id);
  }
}