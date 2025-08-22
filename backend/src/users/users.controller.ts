/**
 * @file users.controller.ts
 * @description Controlador para gestionar las operaciones CRUD de usuarios.
 * Se encarga de recibir las peticiones HTTP y delegar la lógica de negocio al UsersService.
 * @author kevin mariano
 * @version 2.2.0
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

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * @function create
   * @description Crea un nuevo usuario en el sistema.
   * @param {CreateUserDto} createUserDto - Datos para crear el usuario.
   * @returns {Promise<Omit<User, 'password'>>} El usuario creado sin la contraseña.
   * @throws {ConflictException} Si el correo electrónico ya está registrado.
   * @example
   * POST /users
   * Body: { "name": "Test", "email": "test@example.com", "password": "password123", "role": "USER" }
   */
  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'El usuario ha sido creado exitosamente.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado.' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya está registrado.' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * @function findAll
   * @description Obtiene una lista de todos los usuarios. Solo para administradores.
   * @returns {Promise<Omit<User, 'password'>[]>} Un array de usuarios sin sus contraseñas.
   * @example
   * GET /users
   */
  @Get()
  @Roles(Role.ADMIN) // CORREGIDO: Se eliminó Role.OPERATOR que no existe.
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios obtenida.' })
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * @function findOne
   * @description Obtiene un usuario específico por su ID. Solo para administradores.
   * @param {string} id - El ID del usuario a buscar.
   * @returns {Promise<User>} El usuario encontrado.
   * @throws {NotFoundException} Si el usuario con el ID especificado no se encuentra.
   * @example
   * GET /users/clx5e2r9s0000a1b2c3d4e5f6
   */
  @Get(':id')
  @Roles(Role.ADMIN) // CORREGIDO: Se eliminó Role.OPERATOR que no existe.
  @ApiOperation({ summary: 'Obtener un usuario por ID' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * @function update
   * @description Actualiza los datos de un usuario existente.
   * @param {string} id - El ID del usuario a actualizar.
   * @param {UpdateUserDto} updateUserDto - Los nuevos datos para el usuario.
   * @param {any} req - El objeto de la petición, que contiene al usuario autenticado.
   * @returns {Promise<Omit<User, 'password'>>} El usuario actualizado sin la contraseña.
   * @throws {NotFoundException} Si el usuario no se encuentra.
   * @throws {ForbiddenException} Si el usuario no tiene permisos para actualizar.
   * @example
   * PUT /users/clx5e2r9s0000a1b2c3d4e5f6
   * Body: { "name": "Updated Name" }
   */
  @Put(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Actualizar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado correctamente.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado.' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req: any) {
    const currentUser: User = req.user;
    return this.usersService.update(id, updateUserDto, currentUser);
  }

  /**
   * @function remove
   * @description Elimina un usuario del sistema.
   * @param {string} id - El ID del usuario a eliminar.
   * @param {any} req - El objeto de la petición, que contiene al usuario autenticado.
   * @returns {Promise<Omit<User, 'password'>>} El usuario que fue eliminado.
   * @throws {NotFoundException} Si el usuario no se encuentra.
   * @throws {ForbiddenException} Si el usuario no tiene permisos para eliminar o intenta eliminarse a sí mismo siendo ADMIN.
   * @example
   * DELETE /users/clx5e2r9s0000a1b2c3d4e5f6
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado correctamente.' })
  @ApiResponse({ status: 403, description: 'Acceso denegado.' })
  remove(@Param('id') id: string, @Request() req: any) {
    const currentUser: User = req.user;
    return this.usersService.remove(id, currentUser);
  }
}