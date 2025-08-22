import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { User, Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea un nuevo usuario. La contraseña se hashea antes de guardarla.
   */
  async create(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    return this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });
  }

  /**
   * Devuelve una lista de todos los usuarios sin su contraseña.
   * Solo para administradores.
   */
  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        lastLogin: true,
      },
    });
  }

  /**
   * Encuentra un usuario por su ID.
   * Lanza una excepción si no se encuentra.
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
    }
    return user;
  }

  /**
   * Encuentra un usuario por su email (insensible a mayúsculas/minúsculas).
   * Esencial para la lógica de login.
   */
  async findByEmail(email: string) {
    if (typeof email !== 'string') {
      console.error("Error: findByEmail recibió un tipo no válido:", email);
      return null;
    }
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Actualiza un usuario.
   * Verifica los permisos: un admin puede editar a cualquiera, un usuario solo a sí mismo.
   */
  async update(id: string, updateUserDto: UpdateUserDto, currentUser: User) {
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('No tienes permiso para actualizar este usuario.');
    }
    
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  /**
   * Elimina un usuario.
   * Verifica los permisos: un admin puede eliminar a cualquiera, un usuario solo a sí mismo.
   */
  async remove(id: string, currentUser: User) {
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('No tienes permiso para eliminar este usuario.');
    }
    if (currentUser.role === Role.ADMIN && currentUser.id === id) {
        throw new ForbiddenException('Un administrador no puede eliminarse a sí mismo.');
    }
    return this.prisma.user.delete({ where: { id } });
  }
}