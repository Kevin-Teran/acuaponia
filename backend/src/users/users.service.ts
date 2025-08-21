import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { User, Role } from '@prisma/client';
import { Prisma } from '@prisma/client';

// Define un tipo de usuario sin la contraseña para usar en los retornos.
export type UserWithoutPassword = Omit<User, 'password'>;

/**
 * @class UsersService
 * @description Contiene la lógica de negocio para la gestión de usuarios (CRUD).
 * Incluye validaciones de seguridad, de negocio y gestión de la base de datos.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * @method excludePassword
   * @private
   * @description Excluye el campo 'password' de un objeto de usuario.
   * @param {User} user - El objeto de usuario.
   * @returns {UserWithoutPassword} El usuario sin la propiedad de contraseña.
   */
  private excludePassword(user: User): UserWithoutPassword {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  /**
   * @method create
   * @description Crea un nuevo usuario, encriptando la contraseña y validando la unicidad del email.
   * @param {CreateUserDto} createUserDto - Datos para la creación del usuario.
   * @returns {Promise<UserWithoutPassword>} El usuario creado, sin la contraseña.
   * @throws {ConflictException} Si el correo electrónico ya está registrado.
   */
  async create(createUserDto: CreateUserDto): Promise<UserWithoutPassword> {
    const lowerCaseEmail = createUserDto.email.toLowerCase();
    const existingUser = await this.prisma.user.findUnique({ where: { email: lowerCaseEmail } });
    
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está registrado.');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        email: lowerCaseEmail,
        password: hashedPassword,
      },
    });

    this.logger.log(`Usuario creado con éxito. ID: ${user.id}`);
    return this.excludePassword(user);
  }

  /**
   * @method findAll
   * @description Obtiene todos los usuarios con datos relevantes para la tabla de gestión.
   * @returns {Promise<any[]>} Una lista de usuarios con campos seleccionados.
   */
  async findAll() {
    return this.prisma.user.findMany({
      select: { 
        id: true, name: true, email: true, role: true, status: true,
        _count: { select: { tanks: true } }, 
        lastLogin: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * @method findAllSimple
   * @description Obtiene una lista simplificada de usuarios (solo id, nombre y email).
   * @returns {Promise<any[]>} Una lista simplificada de usuarios.
   */
  async findAllSimple() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }
  
  /**
   * @method findOneWithRelations
   * @description Busca un usuario por su ID e incluye sus tanques asociados.
   * @param {string} id - El ID del usuario a buscar.
   * @returns {Promise<UserWithoutPassword>} El usuario encontrado con sus relaciones.
   * @throws {NotFoundException} Si el usuario no se encuentra.
   */
  async findOneWithRelations(id: string): Promise<UserWithoutPassword> {
    const user = await this.prisma.user.findUnique({ 
      where: { id },
      include: {
        tanks: { select: { id: true, name: true, location: true } }
      }
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    return this.excludePassword(user);
  }

  /**
   * @method findByEmail
   * @description Busca un usuario por su email. No es sensible a mayúsculas/minúsculas.
   * @param {string} email - El email a buscar.
   * @returns {Promise<User | null>} El objeto de usuario completo (con contraseña) o null.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  /**
   * @method update
   * @description Actualiza los datos de un usuario.
   * @param {string} id - ID del usuario a actualizar.
   * @param {UpdateUserDto} updateUserDto - Datos para actualizar.
   * @param {User} currentUser - El usuario que realiza la operación.
   * @returns {Promise<UserWithoutPassword>} El usuario actualizado.
   * @throws {ForbiddenException} Si se intenta realizar una acción no permitida.
   * @throws {ConflictException} Si el nuevo email ya está en uso.
   * @throws {NotFoundException} Si el usuario a actualizar no existe.
   */
  async update(id: string, updateUserDto: UpdateUserDto, currentUser: User): Promise<UserWithoutPassword> {
    // Reglas de negocio para auto-actualización
    if (id === currentUser.id) {
      if (updateUserDto.role && updateUserDto.role !== currentUser.role) {
        throw new ForbiddenException('No puedes cambiar tu propio rol.');
      }
      if (typeof updateUserDto.status !== 'undefined' && updateUserDto.status !== currentUser.status) {
        throw new ForbiddenException('No puedes cambiar tu propio estado.');
      }
    } else if (currentUser.role !== Role.ADMIN) {
        // Un no-administrador no puede cambiar rol o estado de otros
        if (updateUserDto.role || typeof updateUserDto.status !== 'undefined') {
            throw new ForbiddenException('No tienes permisos para cambiar el rol o estado de otros usuarios.');
        }
    }

    // Validar unicidad del email si se está cambiando
    if (updateUserDto.email) {
      const lowerCaseEmail = updateUserDto.email.toLowerCase();
      const existingUser = await this.prisma.user.findUnique({ where: { email: lowerCaseEmail } });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('El correo electrónico ya está en uso por otro usuario.');
      }
      updateUserDto.email = lowerCaseEmail;
    }

    // Hashear la nueva contraseña si se proporciona
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });
      
      this.logger.log(`Usuario con ID ${id} actualizado por ${currentUser.email}.`);
      return this.excludePassword(updatedUser);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
      }
      this.logger.error(`Error al actualizar usuario con ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * @method remove
   * @description Elimina un usuario del sistema.
   * @param {string} id - ID del usuario a eliminar.
   * @param {User} currentUser - El usuario que realiza la operación.
   * @returns {Promise<UserWithoutPassword>} El usuario que fue eliminado.
   * @throws {ForbiddenException} Si un usuario intenta eliminarse a sí mismo.
   * @throws {NotFoundException} Si el usuario a eliminar no existe.
   */
  async remove(id: string, currentUser: User): Promise<UserWithoutPassword> {
    if (id === currentUser.id) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta.');
    }

    try {
      const deletedUser = await this.prisma.user.delete({ where: { id } });
      this.logger.warn(`Usuario con ID ${id} eliminado por ${currentUser.email}.`);
      return this.excludePassword(deletedUser);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
      }
      this.logger.error(`Error al eliminar usuario con ID ${id}:`, error);
      throw error;
    }
  }
}