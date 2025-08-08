import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * @controller UsersController
 * @description Define los endpoints de la API para la gestión de usuarios.
 * Todas las rutas están protegidas por autenticación (JWT) y autorización (Roles).
 * Se requiere el rol de 'ADMIN' para acceder a todos los endpoints de este controlador.
 */
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * @route   POST /api/users
   * @desc    Crea un nuevo usuario.
   * @access  Private (Admin)
   */
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * @route   GET /api/users
   * @desc    Obtiene la lista completa de usuarios para la tabla de gestión.
   * @access  Private (Admin)
   */
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * @route   GET /api/users/all
   * @desc    Obtiene una lista simplificada de usuarios (para selectores en el frontend).
   * @access  Private (Admin)
   */
  @Get('all')
  findAllSimple() {
    return this.usersService.findAllSimple();
  }

  /**
   * @route   GET /api/users/:id
   * @desc    Obtiene los detalles de un usuario específico, incluyendo sus tanques asociados.
   * @access  Private (Admin)
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOneWithRelations(id);
  }
  
  /**
   * @route   PUT /api/users/:id
   * @desc    Actualiza un usuario.
   * @access  Private (Admin)
   */
  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req) {
    return this.usersService.update(id, updateUserDto, req.user);
  }

  /**
   * @route   DELETE /api/users/:id
   * @desc    Elimina un usuario.
   * @access  Private (Admin)
   */
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.usersService.remove(id, req.user);
  }
}