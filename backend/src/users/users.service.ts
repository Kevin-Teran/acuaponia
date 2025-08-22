/**
 * @file users.service.ts
 * @description Lógica de negocio para la gestión de usuarios del sistema de acuaponía.
 * Este servicio se comunica directamente con la base de datos a través de Prisma
 * para realizar operaciones CRUD sobre la entidad User con validaciones de seguridad.
 * @author kevin mariano
 * @version 2.4.0
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
 * @typedef {object} UserWithCount
 * @description Tipo personalizado que extiende User con conteo de tanques asociados.
 * @property {string} id - Identificador único del usuario
 * @property {string} email - Correo electrónico único del usuario
 * @property {string} name - Nombre completo del usuario
 * @property {Role} role - Rol del usuario en el sistema (ADMIN, USER)
 * @property {string} status - Estado actual del usuario (ACTIVE, INACTIVE, SUSPENDED)
 * @property {Date} createdAt - Fecha de creación del usuario
 * @property {Date | null} lastLogin - Fecha del último inicio de sesión
 * @property {Date} updatedAt - Fecha de última actualización
 * @property {object} settings - Configuraciones personalizadas del usuario
 * @property {{tanks: number}} _count - Conteo de entidades relacionadas
 */

/**
 * @class UsersService
 * @description Clase que encapsula toda la lógica de negocio para la gestión de usuarios.
 * Implementa operaciones CRUD con validaciones de seguridad, autorización y integridad de datos.
 * @example
 * // Inyección del servicio en un controlador
 * constructor(private readonly usersService: UsersService) {}
 * 
 * // Uso del servicio
 * const newUser = await this.usersService.create({
 *   name: 'Juan Pérez',
 *   email: 'juan@email.com',
 *   password: 'password123',
 *   role: Role.USER
 * });
 */
@Injectable()
export class UsersService {
  /**
   * @constructor
   * @description Inicializa el servicio con la inyección de dependencias de Prisma.
   * @param {PrismaService} prisma - Servicio de Prisma para interacciones con la base de datos.
   */
  constructor(private prisma: PrismaService) {}

  /**
   * @method create
   * @description Crea un nuevo usuario en la base de datos con validaciones de unicidad de email
   * y hash seguro de la contraseña usando bcrypt con salt de 10 rondas.
   * @async
   * @param {CreateUserDto} createUserDto - Objeto con los datos validados del usuario a crear.
   * @returns {Promise<Omit<User, 'password'>>} Promesa que resuelve al usuario creado sin la contraseña.
   * @throws {ConflictException} Si el correo electrónico ya existe en la base de datos.
   * @example
   * const userData = {
   *   name: 'Ana López',
   *   email: 'ana.lopez@email.com',
   *   password: 'miPassword123',
   *   role: Role.USER,
   *   status: 'ACTIVE'
   * };
   * 
   * try {
   *   const newUser = await usersService.create(userData);
   *   console.log(`Usuario creado con ID: ${newUser.id}`);
   * } catch (error) {
   *   if (error instanceof ConflictException) {
   *     console.error('El email ya está registrado');
   *   }
   * }
   */
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado en el sistema.');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);
    
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        status: createUserDto.status || 'ACTIVE',
        role: createUserDto.role || Role.USER,
      },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * @method findAll
   * @description Recupera todos los usuarios de la base de datos con información estadística,
   * excluyendo las contraseñas por seguridad. Incluye conteo de tanques asociados a cada usuario.
   * @async
   * @returns {Promise<UserWithCount[]>} Promesa que resuelve a un array de usuarios con estadísticas.
   * @example
   * const allUsers = await usersService.findAll();
   * console.log(`Total de usuarios: ${allUsers.length}`);
   * 
   * allUsers.forEach(user => {
   *   console.log(`${user.name} tiene ${user._count.tanks} tanques`);
   * });
   */
  async findAll(): Promise<UserWithCount[]> {
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
        _count: {
          select: {
            tanks: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as Promise<UserWithCount[]>;
  }

  /**
   * @method findOne
   * @description Busca y retorna un usuario específico por su identificador único UUID.
   * Incluye toda la información del usuario para operaciones administrativas.
   * @async
   * @param {string} id - El identificador único UUID del usuario.
   * @returns {Promise<User>} Promesa que resuelve al objeto completo del usuario.
   * @throws {NotFoundException} Si no existe ningún usuario con el ID especificado.
   * @example
   * try {
   *   const user = await usersService.findOne('clx5e2r9s0000a1b2c3d4e5f6');
   *   console.log(`Usuario encontrado: ${user.name} (${user.email})`);
   * } catch (error) {
   *   if (error instanceof NotFoundException) {
   *     console.error('Usuario no encontrado en la base de datos');
   *   }
   * }
   */
  async findOne(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ 
      where: { id },
      include: {
        _count: {
          select: {
            tanks: true,
          },
        },
      },
    });
    
    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado en la base de datos.`);
    }
    
    return user;
  }

  /**
   * @method findByEmail
   * @description Busca un usuario por su dirección de correo electrónico único.
   * Utilizado principalmente para validaciones de unicidad y procesos de autenticación.
   * @async
   * @param {string} email - La dirección de correo electrónico a buscar.
   * @returns {Promise<User | null>} Promesa que resuelve al usuario si existe, null en caso contrario.
   * @example
   * const email = 'usuario@acuaponia.com';
   * const existingUser = await usersService.findByEmail(email);
   * 
   * if (existingUser) {
   *   console.log('El email ya está registrado');
   * } else {
   *   console.log('Email disponible para registro');
   * }
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { 
        email: email.toLowerCase().trim() 
      },
    });
  }

  /**
   * @method update
   * @description Actualiza la información de un usuario existente con validaciones de autorización.
   * Los administradores pueden actualizar cualquier usuario, los usuarios regulares solo a sí mismos.
   * @async
   * @param {string} id - El identificador único del usuario a actualizar.
   * @param {UpdateUserDto} updateUserDto - Los datos parciales a actualizar, validados por el DTO.
   * @param {User} currentUser - El usuario que realiza la operación (para validaciones de autorización).
   * @returns {Promise<Omit<User, 'password'>>} Promesa que resuelve al usuario actualizado sin contraseña.
   * @throws {NotFoundException} Si el usuario a actualizar no existe.
   * @throws {ForbiddenException} Si el usuario actual no tiene permisos para la actualización.
   * @throws {ConflictException} Si el nuevo email ya está en uso por otro usuario.
   * @example
   * const updateData = {
   *   name: 'Juan Carlos Pérez',
   *   email: 'juan.carlos@email.com'
   * };
   * 
   * try {
   *   const updatedUser = await usersService.update(
   *     'user-id-to-update', 
   *     updateData, 
   *     currentUser
   *   );
   *   console.log(`Usuario actualizado: ${updatedUser.name}`);
   * } catch (error) {
   *   if (error instanceof ForbiddenException) {
   *     console.error('Sin permisos para actualizar este usuario');
   *   }
   * }
   */
  async update(id: string, updateUserDto: UpdateUserDto, currentUser: User): Promise<Omit<User, 'password'>> {
    if (currentUser.role !== Role.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException(
        'No tienes permisos para actualizar este usuario. Solo los administradores pueden modificar otros usuarios.'
      );
    }

    const userToUpdate = await this.findOne(id);

    if (updateUserDto.email) {
      const emailInUse = await this.findByEmail(updateUserDto.email);
      if (emailInUse && emailInUse.id !== id) {
        throw new ConflictException('El nuevo correo electrónico ya está en uso por otro usuario.');
      }
    }

    if (updateUserDto.password) {
      const saltRounds = 10;
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, saltRounds);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        updatedAt: new Date(),
      },
    });

    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }

  /**
   * @method remove
   * @description Elimina permanentemente un usuario del sistema con todas sus relaciones.
   * Incluye validaciones estrictas para prevenir la eliminación del último administrador.
   * @async
   * @param {string} id - El identificador único del usuario a eliminar.
   * @param {User} currentUser - El usuario que realiza la operación de eliminación.
   * @returns {Promise<Omit<User, 'password'>>} Promesa que resuelve a los datos del usuario eliminado.
   * @throws {NotFoundException} Si el usuario a eliminar no existe en la base de datos.
   * @throws {ForbiddenException} Si no se tienen permisos o se intenta auto-eliminación de admin.
   * @example
   * try {
   *   const deletedUser = await usersService.remove('user-to-delete-id', adminUser);
   *   console.log(`Usuario eliminado: ${deletedUser.name}`);
   * } catch (error) {
   *   if (error instanceof ForbiddenException) {
   *     console.error('No se puede eliminar: permisos insuficientes');
   *   }
   * }
   */
  async remove(id: string, currentUser: User): Promise<Omit<User, 'password'>> {
    if (currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar usuarios. Solo los administradores pueden realizar esta acción.'
      );
    }

    if (currentUser.role === Role.ADMIN && currentUser.id === id) {
      throw new ForbiddenException(
        'Un administrador no puede eliminarse a sí mismo para mantener la integridad del sistema.'
      );
    }

    const userToDelete = await this.findOne(id);

    if (userToDelete.role === Role.ADMIN) {
      const adminCount = await this.prisma.user.count({
        where: { role: Role.ADMIN, status: 'ACTIVE' },
      });

      if (adminCount <= 1) {
        throw new ForbiddenException(
          'No se puede eliminar el último administrador activo del sistema.'
        );
      }
    }

    await this.prisma.user.delete({ where: { id } });

    const { password, ...userWithoutPassword } = userToDelete;
    return userWithoutPassword;
  }
}