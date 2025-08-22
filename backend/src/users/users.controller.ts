/**
 * @file users.controller.ts
 * @description Controlador para gestionar las operaciones CRUD de usuarios.
 * Se encarga de recibir las peticiones HTTP y delegar la lógica de negocio al UsersService.
 * @author kevin mariano
 * @version 2.3.0
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
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, User } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * @class UsersController
 * @description Controlador REST para la gestión de usuarios del sistema de acuaponía.
 * Provee endpoints para operaciones CRUD con validación de roles y autenticación JWT.
 * @example
 * // Crear un nuevo usuario (solo ADMIN)
 * POST /api/users
 * Authorization: Bearer <token>
 * Body: { "name": "Juan Pérez", "email": "juan@email.com", "password": "123456", "role": "USER" }
 */
@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  /**
   * @constructor
   * @description Inyecta el servicio de usuarios para acceder a la lógica de negocio.
   * @param {UsersService} usersService - Servicio que contiene la lógica de usuarios.
   */
  constructor(private readonly usersService: UsersService) {}

  /**
   * @method create
   * @description Crea un nuevo usuario en el sistema. Endpoint protegido para administradores únicamente.
   * @param {CreateUserDto} createUserDto - Datos para crear el usuario validados por el DTO.
   * @returns {Promise<Omit<User, 'password'>>} El usuario creado sin la contraseña por seguridad.
   * @throws {ConflictException} Si el correo electrónico ya está registrado en el sistema.
   * @throws {ForbiddenException} Si el usuario no tiene permisos de administrador.
   * @example
   * // Petición HTTP
   * POST /api/users
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   * Content-Type: application/json
   * {
   *   "name": "María García",
   *   "email": "maria.garcia@email.com",
   *   "password": "segura123",
   *   "role": "USER"
   * }
   * 
   * // Respuesta exitosa
   * {
   *   "id": "clx5e2r9s0000a1b2c3d4e5f6",
   *   "name": "María García",
   *   "email": "maria.garcia@email.com",
   *   "role": "USER",
   *   "status": "ACTIVE",
   *   "createdAt": "2025-01-15T10:30:00.000Z"
   * }
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'El usuario ha sido creado exitosamente.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado. Solo administradores pueden crear usuarios.' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya está registrado.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * @method findAll
   * @description Obtiene una lista completa de todos los usuarios registrados. 
   * Endpoint exclusivo para administradores con información detallada incluyendo conteo de tanques.
   * @returns {Promise<Omit<User, 'password'>[]>} Array de usuarios sin contraseñas, incluyendo estadísticas.
   * @throws {ForbiddenException} Si el usuario no tiene permisos de administrador.
   * @example
   * // Petición HTTP
   * GET /api/users
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   * 
   * // Respuesta exitosa
   * [
   *   {
   *     "id": "clx5e2r9s0000a1b2c3d4e5f6",
   *     "name": "Juan Administrador",
   *     "email": "admin@acuaponia.com",
   *     "role": "ADMIN",
   *     "status": "ACTIVE",
   *     "createdAt": "2025-01-10T08:00:00.000Z",
   *     "lastLogin": "2025-01-15T09:45:00.000Z",
   *     "_count": { "tanks": 3 }
   *   }
   * ]
   */
  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios obtenida exitosamente.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado. Solo administradores pueden ver todos los usuarios.' })
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * @method findOne
   * @description Obtiene los detalles completos de un usuario específico por su ID único.
   * Solo administradores pueden acceder a información detallada de otros usuarios.
   * @param {string} id - El identificador único UUID del usuario a buscar.
   * @returns {Promise<User>} El usuario encontrado con toda su información.
   * @throws {NotFoundException} Si el usuario con el ID especificado no existe en la base de datos.
   * @throws {ForbiddenException} Si el usuario no tiene permisos de administrador.
   * @example
   * // Petición HTTP
   * GET /api/users/clx5e2r9s0000a1b2c3d4e5f6
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   * 
   * // Respuesta exitosa
   * {
   *   "id": "clx5e2r9s0000a1b2c3d4e5f6",
   *   "name": "Carlos Técnico",
   *   "email": "carlos@acuaponia.com",
   *   "role": "USER",
   *   "status": "ACTIVE",
   *   "createdAt": "2025-01-12T14:20:00.000Z",
   *   "lastLogin": "2025-01-15T11:15:00.000Z",
   *   "settings": { "notifications": true, "theme": "dark" }
   * }
   */
  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado exitosamente.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado con el ID especificado.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado. Solo administradores pueden ver detalles de usuarios.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * @method update
   * @description Actualiza los datos de un usuario existente. Los administradores pueden 
   * actualizar cualquier usuario, mientras que los usuarios regulares solo pueden actualizarse a sí mismos.
   * @param {string} id - El identificador único del usuario a actualizar.
   * @param {UpdateUserDto} updateUserDto - Los nuevos datos para el usuario, validados por el DTO.
   * @param {any} req - El objeto de petición HTTP que contiene la información del usuario autenticado.
   * @returns {Promise<Omit<User, 'password'>>} El usuario actualizado sin la contraseña.
   * @throws {NotFoundException} Si el usuario a actualizar no existe en la base de datos.
   * @throws {ForbiddenException} Si el usuario no tiene permisos para realizar la actualización.
   * @throws {ConflictException} Si el nuevo email ya está en uso por otro usuario.
   * @example
   * // Petición HTTP - Administrador actualizando rol
   * PUT /api/users/clx5e2r9s0000a1b2c3d4e5f6
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   * Content-Type: application/json
   * {
   *   "name": "Carlos Técnico Senior",
   *   "role": "ADMIN"
   * }
   * 
   * // Respuesta exitosa
   * {
   *   "id": "clx5e2r9s0000a1b2c3d4e5f6",
   *   "name": "Carlos Técnico Senior",
   *   "email": "carlos@acuaponia.com",
   *   "role": "ADMIN",
   *   "status": "ACTIVE",
   *   "updatedAt": "2025-01-15T12:30:00.000Z"
   * }
   */
  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado correctamente.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado. Permisos insuficientes para actualizar este usuario.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  @ApiResponse({ status: 409, description: 'El nuevo email ya está en uso.' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: any) {
    const currentUser: User = req.user;
    return this.usersService.update(id, updateUserDto, currentUser);
  }

  /**
   * @method remove
   * @description Elimina permanentemente un usuario del sistema, incluyendo todos sus datos asociados.
   * Solo administradores pueden eliminar usuarios, pero no pueden eliminarse a sí mismos para evitar
   * quedarse sin administradores en el sistema.
   * @param {string} id - El identificador único del usuario a eliminar.
   * @param {any} req - El objeto de petición HTTP con la información del usuario autenticado.
   * @returns {Promise<Omit<User, 'password'>>} Los datos del usuario que fue eliminado.
   * @throws {NotFoundException} Si el usuario a eliminar no existe en la base de datos.
   * @throws {ForbiddenException} Si el usuario no tiene permisos de administrador o intenta eliminarse a sí mismo.
   * @example
   * // Petición HTTP
   * DELETE /api/users/clx5e2r9s0000a1b2c3d4e5f6
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   * 
   * // Respuesta exitosa
   * {
   *   "id": "clx5e2r9s0000a1b2c3d4e5f6",
   *   "name": "Usuario Eliminado",
   *   "email": "eliminado@acuaponia.com",
   *   "role": "USER",
   *   "status": "ACTIVE"
   * }
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado correctamente.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado. No puedes eliminar tu propia cuenta o no tienes permisos.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  remove(@Param('id') id: string, @Request() req: any) {
    const currentUser: User = req.user;
    return this.usersService.remove(id, currentUser);
  }
}