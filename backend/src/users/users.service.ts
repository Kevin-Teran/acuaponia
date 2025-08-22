/**
 * @file users.service.ts
 * @description Lógica de negocio para la gestión de usuarios.
 * Este servicio se comunica directamente con la base de datos a través de Prisma
 * para realizar operaciones CRUD sobre la entidad User.
 * @author kevin mariano
 * @version 2.2.0
 * @since 1.0.0
 */

 import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { User, Role } from '@prisma/client';

/**
 * @class UsersService
 * @description Clase que encapsula la lógica de negocio para los usuarios.
 */
@Injectable()
export class UsersService {
  /**
   * @constructor
   * @param {PrismaService} prisma - Inyección del servicio de Prisma para interactuar con la DB.
   */
  constructor(private prisma: PrismaService) {}

  /**
   * @function create
   * @description Crea un nuevo usuario y lo guarda en la base de datos.
   * @param {CreateUserDto} createUserDto - Objeto con los datos del usuario a crear.
   * @returns {Promise<Omit<User, 'password'>>} El objeto del usuario creado, sin la contraseña.
   * @throws {ConflictException} Si el correo electrónico ya existe en la base de datos.
   * @example
   * const newUser = await usersService.create({
   * name: 'John Doe',
   * email: 'john.doe@example.com',
   * password: 'password123',
   * role: 'USER'
   * });
   */
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    const { password, ...result } = user;
    return result;
  }

  /**
   * @function findAll
   * @description Recupera todos los usuarios de la base de datos.
   * @returns {Promise<Omit<User, 'password'>[]>} Un array de todos los usuarios, sin sus contraseñas.
   */
  async findAll(): Promise<Omit<User, 'password'>[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        lastLogin: true,
        updatedAt: true,
        settings: true,
      },
    });
  }

  /**
   * @function findOne
   * @description Busca un usuario por su ID.
   * @param {string} id - El ID único del usuario.
   * @returns {Promise<User>} El objeto completo del usuario.
   * @throws {NotFoundException} Si no se encuentra ningún usuario con ese ID.
   */
  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
    }
    return user;
  }

  /**
   * @function findByEmail
   * @description Busca un usuario por su dirección de correo electrónico.
   * @param {string} email - El correo electrónico del usuario.
   * @returns {Promise<User | null>} El objeto del usuario si se encuentra, de lo contrario null.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * @function update
   * @description Actualiza la información de un usuario.
   * @param {string} id - El ID del usuario a actualizar.
   * @param {UpdateUserDto} updateUserDto - Los datos a actualizar.
   * @param {User} currentUser - El usuario que realiza la operación.
   * @returns {Promise<Omit<User, 'password'>>} El usuario actualizado, sin la contraseña.
   * @throws {ForbiddenException} Si el usuario actual no tiene permisos para modificar al otro usuario.
   */
  async update(id: string, updateUserDto: UpdateUserDto, currentUser: User): Promise<Omit<User, 'password'>> {
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('No tienes permiso para actualizar este usuario.');
    }

    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });

    const { password, ...result } = updatedUser;
    return result;
  }

  /**
   * @function remove
   * @description Elimina un usuario de la base de datos.
   * @param {string} id - El ID del usuario a eliminar.
   * @param {User} currentUser - El usuario que realiza la operación.
   * @returns {Promise<Omit<User, 'password'>>} El usuario eliminado, sin la contraseña.
   * @throws {ForbiddenException} Si el usuario actual no tiene permisos o si un admin intenta eliminarse a sí mismo.
   */
  async remove(id: string, currentUser: User): Promise<Omit<User, 'password'>> {
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('No tienes permiso para eliminar este usuario.');
    }
    if (currentUser.role === Role.ADMIN && currentUser.id === id) {
      throw new ForbiddenException('Un administrador no puede eliminarse a sí mismo.');
    }

    const userToDelete = await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });

    const { password, ...result } = userToDelete;
    return result;
  }
}