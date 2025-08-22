/**
 * @file sensors.controller.ts
 * @description
 * Controlador de NestJS para gestionar las rutas relacionadas con los sensores.
 * Provee endpoints para las operaciones CRUD.
 * @author kevin mariano
 * @version 1.2.0
 * @since 1.0.0
 */

import { Controller, Get, Post, Body, Param, Delete, Put, Query } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { FindSensorsDto } from './dto/find-sensors.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('sensors')
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() createSensorDto: CreateSensorDto) {
    return this.sensorsService.create(createSensorDto);
  }

  /**
   * Obtiene sensores, opcionalmente filtrados por tankId.
   */
  @Get()
  findAll(@Query() findSensorsDto: FindSensorsDto) {
    // CORRECCIÓN 1: Se pasa el DTO completo, que puede contener tankId.
    return this.sensorsService.findAll(findSensorsDto);
  }

  /**
   * Obtiene una lista plana de todos los sensores sin filtros.
   */
  @Get('all')
  findAllFlat() {
    // CORRECCIÓN 2: Se llama al método correcto 'findAllFlat' que no necesita argumentos.
    return this.sensorsService.findAllFlat();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sensorsService.findOne(id);
  }

  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateSensorDto: UpdateSensorDto) {
    return this.sensorsService.update(id, updateSensorDto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.sensorsService.remove(id);
  }
}