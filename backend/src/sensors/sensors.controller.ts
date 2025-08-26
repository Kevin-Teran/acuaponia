/**
 * @file sensors.controller.ts
 * @description Controlador de NestJS para gestionar las rutas de los sensores con nuevas funcionalidades.
 * @author Kevin Mariano
 * @version 5.0.0
 * @since 1.0.0
 */
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Delete, 
  Put, 
  Query, 
  UseGuards,
  Req
} from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { FindSensorsDto } from './dto/find-sensors.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, SensorType, User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

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
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  findAllFlat() {
    return this.sensorsService.findAllFlat();
  }

  /**
   * @method getAvailableTanks
   * @description Endpoint para obtener tanques disponibles para un tipo de sensor.
   * @param {string} sensorType - Tipo de sensor.
   * @param {string} userId - ID del usuario.
   * @param {string} excludeSensorId - ID del sensor a excluir (opcional).
   * @returns {Promise<Tank[]>} Lista de tanques disponibles.
   */
  @Get('available-tanks/:sensorType')
  @Roles(Role.ADMIN, Role.USER)
  getAvailableTanks(
    @Param('sensorType') sensorType: SensorType,
    @Query('userId') userId: string,
    @Query('excludeSensorId') excludeSensorId?: string,
    @Req() req: { user: User }
  ) {
    // Los usuarios normales solo pueden ver sus propios tanques
    const targetUserId = req.user.role === 'ADMIN' ? userId : req.user.id;
    
    return this.sensorsService.getAvailableTanksForSensorType(
      sensorType,
      targetUserId,
      excludeSensorId
    );
  }

  /**
   * @method getSensorCountsByTank
   * @description Endpoint para obtener el conteo de sensores por tipo para un tanque.
   * @param {string} tankId - ID del tanque.
   * @returns {Promise<Record<SensorType, number>>} Conteo por tipo de sensor.
   */
  @Get('counts/tank/:tankId')
  @Roles(Role.ADMIN, Role.USER)
  getSensorCountsByTank(@Param('tankId') tankId: string) {
    return this.sensorsService.getSensorCountByTypeForTank(tankId);
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
  @UseGuards(RolesGuard)
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
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.sensorsService.remove(id);
  }
}