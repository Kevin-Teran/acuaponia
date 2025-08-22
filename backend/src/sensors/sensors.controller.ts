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

  @Get()
  @ApiOperation({ summary: 'Obtener todos los sensores de un tanque específico' })
  @ApiQuery({ name: 'tankId', required: true, description: 'ID del tanque para filtrar sensores', type: 'string' })
  findAll(@Query('tankId', ParseUUIDPipe) tankId: string) {
    if (!tankId) {
      throw new BadRequestException('El parámetro tankId es requerido.');
    }
    return this.sensorsService.findAll(tankId);
  }

  @Get('all')
  @ApiOperation({ summary: 'Obtener todos los sensores del sistema' })
  @ApiResponse({ status: 200, description: 'Lista de todos los sensores del sistema.'})
  findAllSystemSensors() {
    return this.sensorsService.findAll(); // Llama al servicio sin tankId
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
