import { Controller, Get, Post, Body, Param, Delete, Put, UseGuards, Req, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { UsersService, UserWithoutPassword } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';

/**
 * @controller UsersController
 * @description Define los endpoints de la API para la gestión de usuarios.
 * Todos los endpoints requieren autenticación JWT y rol de ADMIN.
 */
@ApiBearerAuth()
@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear un nuevo usuario' })
  @ApiResponse({ status: 201, description: 'El usuario ha sido creado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya está registrado.' })
  create(@Body() createUserDto: CreateUserDto): Promise<UserWithoutPassword> {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de todos los usuarios.' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('all')
  @ApiOperation({ summary: 'Obtener una lista simplificada de usuarios' })
  @ApiResponse({ status: 200, description: 'Lista de usuarios con id, nombre y email.' })
  findAllSimple() {
    return this.usersService.findAllSimple();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por su ID' })
  @ApiResponse({ status: 200, description: 'Detalles del usuario.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserWithoutPassword> {
    return this.usersService.findOneWithRelations(id);
  }
  
  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un usuario existente' })
  @ApiResponse({ status: 200, description: 'El usuario ha sido actualizado exitosamente.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  @ApiResponse({ status: 403, description: 'Acción no permitida.' })
  update(
    @Param('id', ParseUUIDPipe) id: string, 
    @Body() updateUserDto: UpdateUserDto, 
    @Req() req
  ): Promise<UserWithoutPassword> {
    return this.usersService.update(id, updateUserDto, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Eliminar un usuario' })
  @ApiResponse({ status: 200, description: 'El usuario ha sido eliminado exitosamente.' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
  @ApiResponse({ status: 403, description: 'No se puede eliminar a sí mismo.' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req): Promise<UserWithoutPassword> {
    return this.usersService.remove(id, req.user);
  }
}