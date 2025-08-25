/**
 * @file sensors.controller.ts
 * @description Controlador de NestJS para gestionar las rutas de los sensores.
 * @author Kevin Mariano
 * @version 4.0.0
 * @since 1.0.0
 */
import { Controller, Get, Post, Body, Param, Delete, Put, Query, UseGuards } from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { FindSensorsDto } from './dto/find-sensors.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * @class SensorsController
 * @description Expone los endpoints de la API para las operaciones CRUD de sensores.
 */
@Controller('sensors')
@UseGuards(JwtAuthGuard)
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  /**
   * @method create
   * @description Endpoint para crear un nuevo sensor.
   * @param {CreateSensorDto} createSensorDto - Datos para la creación del sensor.
   * @returns {Promise<Sensor>} El sensor recién creado.
   */
  @Post()
  @Roles(Role.ADMIN, Role.USER)
  create(@Body() createSensorDto: CreateSensorDto) {
    return this.sensorsService.create(createSensorDto);
  }

  /**
   * @method findAll
   * @description Endpoint para obtener una lista de sensores.
   * @param {FindSensorsDto} findSensorsDto - DTO con los parámetros de consulta.
   * @returns {Promise<Sensor[]>} Una lista de los sensores encontrados.
   */
  @Get()
  findAll(@Query() findSensorsDto: FindSensorsDto) {
    return this.sensorsService.findAll(findSensorsDto);
  }

  /**
   * @method findAllFlat
   * @description Endpoint para obtener una lista completa de todos los sensores.
   * @returns {Promise<Sensor[]>} Una lista plana de todos los sensores.
   */
  @Get('all')
  findAllFlat() {
    return this.sensorsService.findAllFlat();
  }

  /**
   * @method findOne
   * @description Endpoint para obtener un sensor específico por su ID.
   * @param {string} id - El ID del sensor a buscar.
   * @returns {Promise<Sensor>} El sensor encontrado.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sensorsService.findOne(id);
  }

  /**
   * @method update
   * @description Endpoint para actualizar un sensor existente.
   * @param {string} id - El ID del sensor a actualizar.
   * @param {UpdateSensorDto} updateSensorDto - Los datos para actualizar.
   * @returns {Promise<Sensor>} El sensor actualizado.
   */
  @Put(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() updateSensorDto: UpdateSensorDto) {
    return this.sensorsService.update(id, updateSensorDto);
  }

  /**
   * @method remove
   * @description Endpoint para eliminar un sensor existente.
   * @param {string} id - El ID del sensor a eliminar.
   * @returns {Promise<Sensor>} Los datos del sensor eliminado.
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.sensorsService.remove(id);
  }
}