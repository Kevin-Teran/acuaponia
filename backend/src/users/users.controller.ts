import { Controller, Get, Post, Body, Param, Delete, Put, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, User } from '@prisma/client';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Crea un nuevo usuario. Puede ser una ruta pública si se permite el registro,
   * o protegida para que solo un admin pueda crear usuarios.
   * Por seguridad, la dejaremos protegida por defecto.
   */
  @Post()
  @Roles(Role.ADMIN) 
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  /**
   * Obtiene una lista de todos los usuarios.
   * Protegido para que solo los administradores puedan acceder.
   */
  @Get()
  @Roles(Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  /**
   * Obtiene un usuario específico por su ID.
   * Protegido, pero la lógica de permisos está en el servicio.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  /**
   * Actualiza un usuario.
   * El usuario que realiza la acción se obtiene de la request.
   */
  @Put(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Req() req: Request) {
    const currentUser = req.user as User;
    return this.usersService.update(id, updateUserDto, currentUser);
  }

  /**
   * Elimina un usuario.
   * El usuario que realiza la acción se obtiene de la request.
   */
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: Request) {
    const currentUser = req.user as User;
    return this.usersService.remove(id, currentUser);
  }
}