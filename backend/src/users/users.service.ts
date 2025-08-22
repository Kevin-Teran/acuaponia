/**
 * @file users.service.ts
 * @description Servicio para la gestión de usuarios.
 * Este archivo contiene la lógica de negocio para interactuar con la entidad de usuarios en la base de datos.
 * @author Kevin Mariano
 * @version 2.1.0
 * @since 1.0.0
 */

import {
  Injectable,
  NotFoundException,
  Logger,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaClient, User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * @typedef {Omit<User, 'password'>} UserWithoutPassword
 * @description Define un tipo de objeto de usuario que excluye la propiedad 'password'.
 * Se utiliza para evitar exponer datos sensibles en las respuestas de la API.
 */
export type UserWithoutPassword = Omit<User, 'password'>;

/**
 * @class UsersService
 * @description Clase que encapsula la lógica de negocio para la gestión de usuarios.
 * Provee métodos para crear, leer, actualizar y eliminar usuarios.
 */
@Injectable()
export class UsersService {
  /**
   * @private
   * @type {Logger}
   * @description Instancia del logger para registrar eventos y errores del servicio.
   */
  private readonly logger = new Logger(UsersService.name);

  /**
   * @constructor
   * @description Constructor de la clase UsersService.
   * @param {PrismaService} prisma - El servicio de Prisma para la interacción con la base de datos.
   */
  constructor(private prisma: PrismaService) {}

  /**
   * @public
   * @method excludePassword
   * @description Elimina la propiedad 'password' de un objeto de usuario o de un array de ellos.
   * @param {User | User[]} userOrUsers - El o los objetos de usuario completos.
   * @returns {UserWithoutPassword | UserWithoutPassword[]} El o los objetos de usuario sin la propiedad 'password'.
   * @example
   * const safeUser = this.excludePassword(user);
   */
  excludePassword<T extends User | User[]>(userOrUsers: T): T extends User ? UserWithoutPassword : UserWithoutPassword[] {
    if (Array.isArray(userOrUsers)) {
      return userOrUsers.map(user => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }) as any;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...userWithoutPassword } = userOrUsers;
    return userWithoutPassword as any;
  }

  /**
   * @public
   * @async
   * @method create
   * @description Crea un nuevo usuario en la base de datos. Hashea la contraseña antes de guardarla.
   * @param {CreateUserDto} createUserDto - Datos para la creación del nuevo usuario.
   * @returns {Promise<User>} El usuario creado (objeto completo).
   * @throws {ConflictException} Si el correo electrónico ya está registrado.
   * @throws {InternalServerErrorException} Si ocurre un error inesperado durante la creación.
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Attempting to create user with email: ${createUserDto.email}`);
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          ...createUserDto,
          password: hashedPassword,
        },
      });
      this.logger.log(`User created successfully with ID: ${user.id}`);
      return user;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.warn(`Email already exists: ${createUserDto.email}`);
        throw new ConflictException('El correo electrónico ya está registrado.');
      }
      this.logger.error('Failed to create user', error.stack);
      throw new InternalServerErrorException('No se pudo crear el usuario.');
    }
  }

  /**
   * @public
   * @async
   * @method findAll
   * @description Obtiene una lista de todos los usuarios registrados.
   * @returns {Promise<User[]>} Un arreglo de usuarios (objetos completos).
   * @throws {InternalServerErrorException} Si ocurre un error al consultar la base de datos.
   */
  async findAll(): Promise<User[]> {
    this.logger.log('Fetching all users');
    try {
      return await this.prisma.user.findMany();
    } catch (error) {
      this.logger.error('Failed to fetch all users', error.stack);
      throw new InternalServerErrorException('Error al obtener la lista de usuarios.');
    }
  }

  /**
   * @public
   * @async
   * @method findOne
   * @description Busca y devuelve un usuario por su ID.
   * @param {string} id - El ID único del usuario.
   * @returns {Promise<User>} El usuario encontrado (objeto completo).
   * @throws {NotFoundException} Si no se encuentra ningún usuario con el ID proporcionado.
   */
  async findOne(id: string): Promise<User> {
    this.logger.log(`Fetching user with ID: ${id}`);
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      this.logger.warn(`User with ID "${id}" not found`);
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
    }

    return user;
  }
  
  /**
   * @public
   * @async
   * @method findByEmail
   * @description Busca y devuelve un usuario por su dirección de correo electrónico. **Usado por el módulo de autenticación.**
   * @param {string} email - El correo electrónico del usuario.
   * @returns {Promise<User | null>} El usuario encontrado (objeto completo) o null si no existe.
   */
  async findByEmail(email: string): Promise<User | null> {
    this.logger.log(`Fetching user by email: ${email}`);
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * @public
   * @async
   * @method update
   * @description Actualiza los datos de un usuario existente.
   * @param {string} id - El ID del usuario a actualizar.
   * @param {UpdateUserDto} updateUserDto - Los datos a actualizar.
   * @returns {Promise<User>} El usuario actualizado (objeto completo).
   * @throws {NotFoundException} Si el usuario a actualizar no existe.
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    this.logger.log(`Updating user with ID: ${id}`);
    const data = { ...updateUserDto };

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        this.logger.warn(`User with ID "${id}" not found for update`);
        throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
      }
      this.logger.error(`Failed to update user with ID ${id}`, error.stack);
      throw new InternalServerErrorException('No se pudo actualizar el usuario.');
    }
  }

  /**
   * @public
   * @async
   * @method remove
   * @description Elimina un usuario de la base de datos por su ID.
   * @param {string} id - El ID del usuario a eliminar.
   * @returns {Promise<User>} El usuario que fue eliminado (objeto completo).
   * @throws {NotFoundException} Si el usuario a eliminar no existe.
   */
  async remove(id: string): Promise<User> {
    this.logger.log(`Removing user with ID: ${id}`);
    try {
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        this.logger.warn(`User with ID "${id}" not found for deletion`);
        throw new NotFoundException(`Usuario con ID "${id}" no encontrado.`);
      }
      this.logger.error(`Failed to remove user with ID ${id}`, error.stack);
      throw new InternalServerErrorException('No se pudo eliminar el usuario.');
    }
  }
}