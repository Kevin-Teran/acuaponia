/**
 * @file users.service.ts
 * @description Servicio que encapsula toda la lógica de negocio para la gestión de usuarios (CRUD).
 * Interactúa con la base de datos a través de Prisma y maneja operaciones sensibles
 * como la creación y actualización de usuarios, incluyendo el hasheo de contraseñas.
 * @author Kevin Mariano
 * @version 1.2.0
 * @since 1.0.0
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  /**
   * @public
   * @constructor
   * @param {PrismaService} prisma - Inyección del servicio de Prisma para la comunicación con la BD.
   */
  constructor(private prisma: PrismaService) {}

  /**
   * @method create
   * @description Crea un nuevo usuario en la base de datos.
   * Hashea la contraseña antes de guardarla.
   * @param {CreateUserDto} createUserDto - Datos para crear el nuevo usuario.
   * @returns {Promise<Omit<User, 'password'>>} El usuario creado, sin la contraseña.
   * @throws {ConflictException} Si el email ya está en uso.
   */
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);

    try {
      const user = await this.prisma.user.create({
        data: {
          ...createUserDto,
          password: hashedPassword,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    } catch (error) {
      if (error.code === 'P2002') { // Error de constraint único de Prisma
        throw new ConflictException('El correo electrónico ya está registrado.');
      }
      throw error;
    }
  }

  /**
   * @method findAll
   * @description Devuelve una lista de todos los usuarios.
   * Excluye las contraseñas de los resultados.
   * @returns {Promise<Omit<User, 'password'>[]>} Un arreglo de usuarios.
   */
  async findAll(): Promise<Omit<User, 'password'>[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        settings: true,
      },
    });
  }

  /**
   * @method findOne
   * @description Busca un usuario por su ID.
   * @param {string} id - El ID del usuario a buscar.
   * @returns {Promise<Omit<User, 'password'>>} El usuario encontrado, sin la contraseña.
   * @throws {NotFoundException} Si el usuario no se encuentra.
   */
  async findOne(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  /**
   * @method update
   * @description Actualiza los datos de un usuario por su ID.
   * Si se proporciona una nueva contraseña en el DTO, la hashea antes de guardarla.
   * @param {string} id - El ID del usuario a actualizar.
   * @param {UpdateUserDto} updateUserDto - Los datos para actualizar.
   * @returns {Promise<Omit<User, 'password'>>} El usuario actualizado, sin la contraseña.
   * @throws {NotFoundException} Si el usuario no se encuentra.
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<Omit<User, 'password'>> {
    if (updateUserDto.password) {
      const saltRounds = 10;
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = updatedUser;
      return result;
    } catch (error) {
      if (error.code === 'P2025') { 
        throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
      }
      throw error;
    }
  }

  /**
   * @method remove
   * @description Elimina un usuario de la base de datos por su ID.
   * @param {string} id - El ID del usuario a eliminar.
   * @returns {Promise<Omit<User, 'password'>>} El usuario que fue eliminado.
   * @throws {NotFoundException} Si el usuario no se encuentra.
   */
  async remove(id: string): Promise<Omit<User, 'password'>> {
    try {
      const user = await this.prisma.user.delete({ where: { id } });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
      }
      throw error;
    }
  }
}