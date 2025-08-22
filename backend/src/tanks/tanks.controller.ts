import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TanksService } from './tanks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseUtil } from '../common/utils/response.util';

/**
 * @typedef {Object} CreateTankDto
 * @property {string} name - Nombre del tanque
 * @property {string} location - Ubicación del tanque
 */
class CreateTankDto {
  name: string;
  location: string;
}

/**
 * Controlador de tanques
 * @class TanksController
 * @description Maneja las rutas relacionadas con la gestión de tanques
 */
@ApiTags('tanks')
@Controller('tanks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TanksController {
  /**
   * Constructor del controlador de tanques
   * @param {TanksService} tanksService - Servicio de tanques
   */
  constructor(private readonly tanksService: TanksService) {}

  /**
   * Crea un nuevo tanque
   * @async
   * @param {CreateTankDto} createTankDto - Datos del tanque
   * @param {any} req - Request con usuario autenticado
   * @returns {Promise<any>} Tanque creado
   * @example
   * POST /tanks
   * Body: { "name": "Tanque Principal", "location": "Invernadero A" }
   */
  @Post()
  @ApiOperation({ summary: 'Crear nuevo tanque' })
  @ApiResponse({ status: 201, description: 'Tanque creado exitosamente' })
  async create(@Body() createTankDto: CreateTankDto, @Request() req: any) {
    const tank = await this.tanksService.create({
      ...createTankDto,
      userId: req.user.id,
    });
    return ResponseUtil.success(tank, 'Tanque creado exitosamente');
  }

  /**
   * Obtiene todos los tanques del usuario autenticado
   * @async
   * @param {any} req - Request con usuario autenticado
   * @returns {Promise<any>} Lista de tanques del usuario
   * @example
   * GET /tanks
   */
  @Get()
  @ApiOperation({ summary: 'Obtener tanques del usuario' })
  @ApiResponse({ status: 200, description: 'Tanques obtenidos exitosamente' })
  async findAll(@Request() req: any) {
    const tanks = await this.tanksService.findByUserId(req.user.id);
    return ResponseUtil.success(tanks, 'Tanques obtenidos exitosamente');
  }

  /**
   * Obtiene el tanque más reciente del usuario
   * @async
   * @param {any} req - Request con usuario autenticado
   * @returns {Promise<any>} Tanque más reciente
   * @example
   * GET /tanks/latest
   */
  @Get('latest')
  @ApiOperation({ summary: 'Obtener tanque más reciente' })
  @ApiResponse({ status: 200, description: 'Tanque más reciente obtenido' })
  async findLatest(@Request() req: any) {
    const tank = await this.tanksService.findLatestByUserId(req.user.id);
    return ResponseUtil.success(tank, 'Tanque más reciente obtenido');
  }

  /**
   * Obtiene un tanque por ID
   * @async
   * @param {string} id - ID del tanque
   * @returns {Promise<any>} Tanque encontrado
   * @example
   * GET /tanks/tank-uuid
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener tanque por ID' })
  @ApiResponse({ status: 200, description: 'Tanque encontrado' })
  @ApiResponse({ status: 404, description: 'Tanque no encontrado' })
  async findOne(@Param('id') id: string) {
    const tank = await this.tanksService.findById(id);
    return ResponseUtil.success(tank, 'Tanque encontrado');
  }

  /**
   * Elimina un tanque
   * @async
   * @param {string} id - ID del tanque
   * @returns {Promise<any>} Confirmación de eliminación
   * @example
   * DELETE /tanks/tank-uuid
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar tanque' })
  @ApiResponse({ status: 200, description: 'Tanque eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Tanque no encontrado' })
  async remove(@Param('id') id: string) {
    await this.tanksService.remove(id);
    return ResponseUtil.success(null, 'Tanque eliminado exitosamente');
  }
}