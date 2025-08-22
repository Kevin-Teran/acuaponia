import { Controller, Get, Delete, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseUtil } from '../common/utils/response.util';

/**
 * Controlador de usuarios
 * @class UsersController
 * @description Maneja las rutas relacionadas con la gestión de usuarios
 */
@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  /**
   * Constructor del controlador de usuarios
   * @param {UsersService} usersService - Servicio de usuarios
   */
  constructor(private readonly usersService: UsersService) {}

  /**
   * Obtiene todos los usuarios con paginación
   * @async
   * @param {string} [page='1'] - Número de página
   * @param {string} [limit='10'] - Elementos por página
   * @returns {Promise<any>} Lista paginada de usuarios
   * @example
   * GET /users?page=1&limit=10
   */
  @Get()
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios obtenida exitosamente' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const result = await this.usersService.findAll(
      parseInt(page),
      parseInt(limit),
    );
    return ResponseUtil.success(result, 'Usuarios obtenidos exitosamente');
  }

  /**
   * Obtiene un usuario por ID
   * @async
   * @param {string} id - ID del usuario
   * @returns {Promise<any>} Usuario encontrado
   * @example
   * GET /users/user-uuid
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return ResponseUtil.success(user, 'Usuario encontrado');
  }

  /**
   * Elimina un usuario
   * @async
   * @param {string} id - ID del usuario
   * @returns {Promise<any>} Confirmación de eliminación
   * @example
   * DELETE /users/user-uuid
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return ResponseUtil.success(null, 'Usuario eliminado exitosamente');
  }
}