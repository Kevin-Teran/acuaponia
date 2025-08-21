/**
 * @file users.service.ts
 * @description Servicio avanzado para la gestión integral de usuarios del sistema de acuaponía.
 * Incluye operaciones CRUD, validaciones, búsquedas y gestión de estados de usuario.
 * @author Sistema de Acuaponía SENA
 * @version 3.0.0
 * @since 1.0.0
 */

 import { Injectable, NotFoundException, BadRequestException, Logger, ConflictException } from '@nestjs/common';
 import { PrismaService } from '../prisma/prisma.service';
 import { User, Role, users_status } from '@prisma/client';
 import * as bcrypt from 'bcrypt';
 
 /**
  * @typedef {Object} CreateUserDto
  * @property {string} email - Correo electrónico único del usuario
  * @property {string} password - Contraseña en texto plano (será hasheada)
  * @property {string} name - Nombre completo del usuario
  * @property {Role} role - Rol asignado al usuario
  */
 interface CreateUserDto {
   email: string;
   password: string;
   name: string;
   role?: Role;
 }
 
 /**
  * @typedef {Object} UpdateUserDto
  * @property {string} name - Nombre completo del usuario
  * @property {Role} role - Rol del usuario
  * @property {users_status} status - Estado del usuario
  */
 interface UpdateUserDto {
   name?: string;
   role?: Role;
   status?: users_status;
 }
 
 /**
  * @typedef {Object} UserProfileResponse
  * @property {string} id - ID único del usuario
  * @property {string} email - Correo electrónico
  * @property {string} name - Nombre completo
  * @property {Role} role - Rol del usuario
  * @property {users_status} status - Estado del usuario
  * @property {Date} createdAt - Fecha de creación
  * @property {Date} lastLogin - Última fecha de login
  */
 interface UserProfileResponse {
   id: string;
   email: string;
   name: string;
   role: Role;
   status: users_status;
   createdAt: Date;
   lastLogin?: Date;
 }
 
 /**
  * @typedef {Object} UserSearchFilters
  * @property {string} search - Término de búsqueda para nombre o email
  * @property {Role} role - Filtrar por rol específico
  * @property {users_status} status - Filtrar por estado específico
  * @property {number} page - Número de página (empezando en 1)
  * @property {number} limit - Límite de resultados por página
  */
 interface UserSearchFilters {
   search?: string;
   role?: Role;
   status?: users_status;
   page?: number;
   limit?: number;
 }
 
 /**
  * @typedef {Object} PaginatedUsersResponse
  * @property {UserProfileResponse[]} users - Lista de usuarios
  * @property {number} total - Total de usuarios que coinciden con los filtros
  * @property {number} page - Página actual
  * @property {number} totalPages - Total de páginas disponibles
  * @property {number} limit - Límite por página
  */
 interface PaginatedUsersResponse {
   users: UserProfileResponse[];
   total: number;
   page: number;
   totalPages: number;
   limit: number;
 }
 
 /**
  * @class UsersService
  * @description Servicio principal para la gestión de usuarios del sistema.
  * Proporciona operaciones completas de CRUD, búsquedas avanzadas y validaciones.
  */
 @Injectable()
 export class UsersService {
   /** @private {Logger} logger - Logger específico para este servicio */
   private readonly logger = new Logger(UsersService.name);
   
   /** @private {number} DEFAULT_PAGE_SIZE - Tamaño de página por defecto para paginación */
   private readonly DEFAULT_PAGE_SIZE = 10;
   
   /** @private {number} MAX_PAGE_SIZE - Tamaño máximo de página permitido */
   private readonly MAX_PAGE_SIZE = 100;
   
   /** @private {number} SALT_ROUNDS - Rounds para el hash de bcrypt */
   private readonly SALT_ROUNDS = 12;
 
   /**
    * @constructor
    * @description Inicializa el servicio de usuarios con PrismaService.
    * @param {PrismaService} prisma - Servicio de base de datos Prisma
    */
   constructor(private readonly prisma: PrismaService) {}
 
   /**
    * @method findOneByEmail
    * @description Busca un usuario específico por su dirección de correo electrónico.
    * Método fundamental utilizado durante el proceso de autenticación.
    * @param {string} email - Correo electrónico del usuario a buscar
    * @returns {Promise<User | null>} Usuario encontrado o null si no existe
    * @throws {BadRequestException} Cuando el email no tiene un formato válido
    * @example
    * const user = await usersService.findOneByEmail('admin@sena.edu.co');
    * if (user) {
    *   console.log('Usuario encontrado:', user.name);
    * }
    */
   async findOneByEmail(email: string): Promise<User | null> {
     try {
       // Validar formato de email
       if (!this.isValidEmail(email)) {
         throw new BadRequestException('Formato de email inválido');
       }
 
       const user = await this.prisma.user.findUnique({
         where: { email: email.toLowerCase().trim() },
         include: {
           tanks: {
             select: { id: true, name: true, status: true }
           },
           _count: {
             select: { 
               alerts: true, 
               reports: true,
               tanks: true
             }
           }
         }
       });
 
       if (user) {
         this.logger.log(`Usuario encontrado por email: ${email}`);
       }
 
       return user;
     } catch (error) {
       if (error instanceof BadRequestException) {
         throw error;
       }
       this.logger.error(`Error buscando usuario por email ${email}: ${error.message}`, error.stack);
       throw new BadRequestException('Error al buscar el usuario');
     }
   }
 
   /**
    * @method findById
    * @description Busca un usuario por su ID único.
    * @param {string} id - ID único del usuario
    * @returns {Promise<User | null>} Usuario encontrado o null si no existe
    * @throws {BadRequestException} Cuando el ID no es válido
    * @example
    * const user = await usersService.findById('clp123abc456');
    * console.log('Usuario:', user?.name);
    */
   async findById(id: string): Promise<User | null> {
     try {
       if (!id || typeof id !== 'string' || id.trim().length === 0) {
         throw new BadRequestException('ID de usuario requerido');
       }
 
       const user = await this.prisma.user.findUnique({
         where: { id },
         include: {
           tanks: {
             select: { 
               id: true, 
               name: true, 
               status: true,
               location: true,
               _count: {
                 select: { sensors: true }
               }
             }
           }
         }
       });
 
       if (!user) {
         this.logger.warn(`Usuario no encontrado con ID: ${id}`);
         return null;
       }
 
       return user;
     } catch (error) {
       if (error instanceof BadRequestException) {
         throw error;
       }
       this.logger.error(`Error buscando usuario por ID ${id}: ${error.message}`, error.stack);
       throw new BadRequestException('Error al buscar el usuario');
     }
   }
 
   /**
    * @method updateLastLogin
    * @description Actualiza la fecha y hora del último login de un usuario.
    * Se ejecuta automáticamente durante el proceso de autenticación exitosa.
    * @param {string} userId - ID único del usuario
    * @returns {Promise<void>} Promesa que se resuelve cuando se actualiza
    * @throws {NotFoundException} Cuando el usuario no existe
    * @example
    * await usersService.updateLastLogin('clp123abc456');
    */
   async updateLastLogin(userId: string): Promise<void> {
     try {
       const result = await this.prisma.user.update({
         where: { id: userId },
         data: { lastLogin: new Date() },
         select: { id: true, email: true }
       });
 
       this.logger.log(`Último login actualizado para usuario: ${result.email}`);
     } catch (error) {
       if (error.code === 'P2025') {
         throw new NotFoundException('Usuario no encontrado');
       }
       this.logger.error(`Error actualizando último login para ${userId}: ${error.message}`, error.stack);
       throw new BadRequestException('Error al actualizar el último login');
     }
   }
 
   /**
    * @method createUser
    * @description Crea un nuevo usuario en el sistema con validaciones completas.
    * @param {CreateUserDto} userData - Datos del usuario a crear
    * @returns {Promise<UserProfileResponse>} Usuario creado (sin contraseña)
    * @throws {ConflictException} Cuando el email ya está en uso
    * @throws {BadRequestException} Cuando los datos son inválidos
    * @example
    * const newUser = await usersService.createUser({
    *   email: 'nuevo@sena.edu.co',
    *   password: 'password123',
    *   name: 'Nuevo Usuario',
    *   role: Role.USER
    * });
    */
   async createUser(userData: CreateUserDto): Promise<UserProfileResponse> {
     try {
       this.validateUserData(userData);
 
       const existingUser = await this.findOneByEmail(userData.email);
       if (existingUser) {
         throw new ConflictException('El correo electrónico ya está registrado');
       }
 
       const hashedPassword = await bcrypt.hash(userData.password, this.SALT_ROUNDS);
 
       const user = await this.prisma.user.create({
         data: {
           email: userData.email.toLowerCase().trim(),
           password: hashedPassword,
           name: userData.name.trim(),
           role: userData.role || Role.USER,
           status: users_status.ACTIVE,
         },
         select: {
           id: true,
           email: true,
           name: true,
           role: true,
           status: true,
           createdAt: true,
           lastLogin: true
         }
       });
 
       this.logger.log(`Usuario creado exitosamente: ${user.email}`);
       return user;
 
     } catch (error) {
       if (error instanceof ConflictException || error instanceof BadRequestException) {
         throw error;
       }
       this.logger.error(`Error creando usuario: ${error.message}`, error.stack);
       throw new BadRequestException('Error al crear el usuario');
     }
   }
 
   /**
    * @method updateUser
    * @description Actualiza los datos de un usuario existente.
    * @param {string} userId - ID del usuario a actualizar
    * @param {UpdateUserDto} updateData - Datos a actualizar
    * @returns {Promise<UserProfileResponse>} Usuario actualizado
    * @throws {NotFoundException} Cuando el usuario no existe
    * @throws {BadRequestException} Cuando los datos son inválidos
    * @example
    * const updatedUser = await usersService.updateUser('clp123abc456', {
    *   name: 'Nombre Actualizado',
    *   role: Role.ADMIN
    * });
    */
   async updateUser(userId: string, updateData: UpdateUserDto): Promise<UserProfileResponse> {
     try {
       const existingUser = await this.findById(userId);
       if (!existingUser) {
         throw new NotFoundException('Usuario no encontrado');
       }
 
       this.validateUpdateData(updateData);
 
       const updatedUser = await this.prisma.user.update({
         where: { id: userId },
         data: {
           ...updateData,
           updatedAt: new Date()
         },
         select: {
           id: true,
           email: true,
           name: true,
           role: true,
           status: true,
           createdAt: true,
           lastLogin: true
         }
       });
 
       this.logger.log(`Usuario actualizado: ${updatedUser.email}`);
       return updatedUser;
 
     } catch (error) {
       if (error instanceof NotFoundException || error instanceof BadRequestException) {
         throw error;
       }
       this.logger.error(`Error actualizando usuario ${userId}: ${error.message}`, error.stack);
       throw new BadRequestException('Error al actualizar el usuario');
     }
   }
 
   /**
    * @method findUsers
    * @description Busca usuarios con filtros avanzados y paginación.
    * @param {UserSearchFilters} filters - Filtros de búsqueda
    * @returns {Promise<PaginatedUsersResponse>} Resultado paginado de usuarios
    * @throws {BadRequestException} Cuando los filtros son inválidos
    * @example
    * const users = await usersService.findUsers({
    *   search: 'admin',
    *   role: Role.ADMIN,
    *   page: 1,
    *   limit: 10
    * });
    */
   async findUsers(filters: UserSearchFilters = {}): Promise<PaginatedUsersResponse> {
     try {
       const {
         search,
         role,
         status,
         page = 1,
         limit = this.DEFAULT_PAGE_SIZE
       } = filters;
 
       const validatedLimit = Math.min(Math.max(1, limit), this.MAX_PAGE_SIZE);
       const validatedPage = Math.max(1, page);
       const skip = (validatedPage - 1) * validatedLimit;
 
       const where: any = {};
 
       if (search) {
         where.OR = [
           { name: { contains: search, mode: 'insensitive' } },
           { email: { contains: search, mode: 'insensitive' } }
         ];
       }
 
       if (role) {
         where.role = role;
       }
 
       if (status) {
         where.status = status;
       }
 
       // Ejecutar búsqueda con conteo total
       const [users, total] = await Promise.all([
         this.prisma.user.findMany({
           where,
           select: {
             id: true,
             email: true,
             name: true,
             role: true,
             status: true,
             createdAt: true,
             lastLogin: true
           },
           skip,
           take: validatedLimit,
           orderBy: [
             { createdAt: 'desc' },
             { name: 'asc' }
           ]
         }),
         this.prisma.user.count({ where })
       ]);
 
       const totalPages = Math.ceil(total / validatedLimit);
 
       return {
         users,
         total,
         page: validatedPage,
         totalPages,
         limit: validatedLimit
       };
 
     } catch (error) {
       this.logger.error(`Error en búsqueda de usuarios: ${error.message}`, error.stack);
       throw new BadRequestException('Error al buscar usuarios');
     }
   }
 
   /**
    * @method changeUserStatus
    * @description Cambia el estado de un usuario (activar/desactivar/suspender).
    * @param {string} userId - ID del usuario
    * @param {users_status} newStatus - Nuevo estado
    * @returns {Promise<UserProfileResponse>} Usuario con estado actualizado
    * @throws {NotFoundException} Cuando el usuario no existe
    * @example
    * const user = await usersService.changeUserStatus('clp123abc456', users_status.SUSPENDED);
    */
   async changeUserStatus(userId: string, newStatus: users_status): Promise<UserProfileResponse> {
     try {
       const updatedUser = await this.prisma.user.update({
         where: { id: userId },
         data: { 
           status: newStatus,
           updatedAt: new Date()
         },
         select: {
           id: true,
           email: true,
           name: true,
           role: true,
           status: true,
           createdAt: true,
           lastLogin: true
         }
       });
 
       this.logger.log(`Estado de usuario cambiado a ${newStatus}: ${updatedUser.email}`);
       return updatedUser;
 
     } catch (error) {
       if (error.code === 'P2025') {
         throw new NotFoundException('Usuario no encontrado');
       }
       this.logger.error(`Error cambiando estado del usuario ${userId}: ${error.message}`, error.stack);
       throw new BadRequestException('Error al cambiar el estado del usuario');
     }
   }
 
   /**
    * @method getUserStats
    * @description Obtiene estadísticas de un usuario específico.
    * @param {string} userId - ID del usuario
    * @returns {Promise<UserStats>} Estadísticas del usuario
    * @throws {NotFoundException} Cuando el usuario no existe
    * @example
    * const stats = await usersService.getUserStats('clp123abc456');
    * console.log('Tanques administrados:', stats.tanksCount);
    */
   async getUserStats(userId: string): Promise<UserStats> {
     try {
       const user = await this.prisma.user.findUnique({
         where: { id: userId },
         include: {
           _count: {
             select: {
               tanks: true,
               alerts: true,
               reports: true
             }
           },
           tanks: {
             include: {
               _count: {
                 select: { sensors: true }
               }
             }
           }
         }
       });
 
       if (!user) {
         throw new NotFoundException('Usuario no encontrado');
       }
 
       const totalSensors = user.tanks.reduce((sum, tank) => sum + tank._count.sensors, 0);
       const activeTanks = user.tanks.filter(tank => tank.status === 'ACTIVE').length;
 
       return {
         tanksCount: user._count.tanks,
         activeTanksCount: activeTanks,
         sensorsCount: totalSensors,
         alertsCount: user._count.alerts,
         reportsCount: user._count.reports,
         lastLogin: user.lastLogin
       };
 
     } catch (error) {
       if (error instanceof NotFoundException) {
         throw error;
       }
       this.logger.error(`Error obteniendo estadísticas del usuario ${userId}: ${error.message}`, error.stack);
       throw new BadRequestException('Error al obtener las estadísticas del usuario');
     }
   }
 
   /**
    * @method validateUserData
    * @description Valida los datos de entrada para crear un usuario.
    * @param {CreateUserDto} userData - Datos del usuario a validar
    * @throws {BadRequestException} Cuando los datos son inválidos
    * @private
    */
   private validateUserData(userData: CreateUserDto): void {
     const errors: string[] = [];
 
     if (!userData.email || !this.isValidEmail(userData.email)) {
       errors.push('Email válido es requerido');
     }
 
     if (!userData.password || userData.password.length < 6) {
       errors.push('Contraseña debe tener al menos 6 caracteres');
     }
 
     if (!userData.name || userData.name.trim().length < 2) {
       errors.push('Nombre debe tener al menos 2 caracteres');
     }
 
     if (userData.role && !Object.values(Role).includes(userData.role)) {
       errors.push('Rol inválido');
     }
 
     if (errors.length > 0) {
       throw new BadRequestException(`Datos inválidos: ${errors.join(', ')}`);
     }
   }
 
   /**
    * @method validateUpdateData
    * @description Valida los datos de actualización de usuario.
    * @param {UpdateUserDto} updateData - Datos a validar
    * @throws {BadRequestException} Cuando los datos son inválidos
    * @private
    */
   private validateUpdateData(updateData: UpdateUserDto): void {
     const errors: string[] = [];
 
     if (updateData.name !== undefined && updateData.name.trim().length < 2) {
       errors.push('Nombre debe tener al menos 2 caracteres');
     }
 
     if (updateData.role !== undefined && !Object.values(Role).includes(updateData.role)) {
       errors.push('Rol inválido');
     }
 
     if (updateData.status !== undefined && !Object.values(users_status).includes(updateData.status)) {
       errors.push('Estado inválido');
     }
 
     if (errors.length > 0) {
       throw new BadRequestException(`Datos de actualización inválidos: ${errors.join(', ')}`);
     }
   }
 
   /**
    * @method isValidEmail
    * @description Valida el formato de un email usando expresión regular.
    * @param {string} email - Email a validar
    * @returns {boolean} True si el email es válido
    * @private
    */
   private isValidEmail(email: string): boolean {
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     return emailRegex.test(email);
   }
 }
 
 /**
  * @typedef {Object} UserStats
  * @property {number} tanksCount - Número total de tanques
  * @property {number} activeTanksCount - Número de tanques activos
  * @property {number} sensorsCount - Número total de sensores
  * @property {number} alertsCount - Número de alertas
  * @property {number} reportsCount - Número de reportes
  * @property {Date | null} lastLogin - Fecha del último login
  */
 interface UserStats {
   tanksCount: number;
   activeTanksCount: number;
   sensorsCount: number;
   alertsCount: number;
   reportsCount: number;
   lastLogin: Date | null;
 }