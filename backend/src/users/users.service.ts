import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { User, Role } from '@prisma/client';

/**
 * @class UsersService
 * @description Contiene la lógica de negocio para la gestión de usuarios (CRUD),
 * incluyendo validaciones de seguridad y de negocio.
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * @method create
   * @description Crea un nuevo usuario, encriptando la contraseña y validando la unicidad del email.
   * @param {CreateUserDto} createUserDto - Datos para la creación del usuario.
   * @returns {Promise<Omit<User, 'password'>>} El usuario creado, sin la contraseña.
   * @throws {ConflictException} Si el correo electrónico ya está en uso.
   */
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  /**
   * @method findAll
   * @description Obtiene todos los usuarios con datos relevantes para la tabla de gestión.
   */
  findAll() {
    return this.prisma.user.findMany({
      select: { 
        id: true, name: true, email: true, role: true, status: true,
        _count: { select: { tanks: true } }, lastLogin: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * @method findAllSimple
   * @description Obtiene una lista simplificada de usuarios (solo id, nombre y email),
   * ideal para poblar menús desplegables en el frontend.
   */
  findAllSimple() {
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    });
  }
  
  /**
   * @method findOneWithRelations
   * @description Busca un usuario por ID e incluye sus tanques asociados.
   * @throws {NotFoundException} Si el usuario no se encuentra.
   */
  async findOneWithRelations(id: string): Promise<Omit<User, 'password'>> {
    const user = await this.prisma.user.findUnique({ 
      where: { id },
      include: {
        tanks: { select: { id: true, name: true, location: true } }
      }
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado.`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...result } = user;
    return result;
  }

  /**
   * @method findByEmail
   * @description Busca un usuario por su email. Es sensible a mayúsculas/minúsculas.
   * Utilizado internamente por `AuthService`.
   * @param {string} email - El email a buscar.
   * @returns {Promise<User | null>} El usuario encontrado o null.
   */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  /**
   * @method update
   * @description Actualiza los datos de un usuario, aplicando reglas de negocio y seguridad.
   * @param {string} id - ID del usuario a actualizar.
   * @param {UpdateUserDto} updateUserDto - Datos para actualizar.
   * @param {User} currentUser - El usuario que realiza la operación (autenticado).
   * @returns {Promise<Omit<User, 'password'>>} El usuario actualizado.
   * @throws {ForbiddenException} Si se intenta realizar una acción no permitida (ej. cambiarse el propio rol).
   * @throws {ConflictException} Si el nuevo email ya está en uso.
   */
  async update(id: string, updateUserDto: UpdateUserDto, currentUser: User): Promise<Omit<User, 'password'>> {
    if (id === currentUser.id) {
      if (updateUserDto.role && updateUserDto.role !== currentUser.role) {
        throw new ForbiddenException('No puedes cambiar tu propio rol.');
      }
      if (updateUserDto.status && updateUserDto.status !== currentUser.status) {
        throw new ForbiddenException('No puedes cambiar tu propio estado.');
      }
    } else {
        if ((updateUserDto.role || updateUserDto.status) && currentUser.role !== Role.ADMIN) {
            throw new ForbiddenException('No tienes permisos para cambiar el rol o estado de otros usuarios.');
        }
    }

    if (updateUserDto.email) {
      const lowerCaseEmail = updateUserDto.email.toLowerCase();
      const existingUser = await this.prisma.user.findUnique({ where: { email: lowerCaseEmail } });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('El correo electrónico ya está en uso por otro usuario.');
      }
      updateUserDto.email = lowerCaseEmail;
    }

    if (updateUserDto.password) {
      if (updateUserDto.password.length < 6) {
        throw new ForbiddenException('La contraseña debe tener al menos 6 caracteres.');
      }
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    
    try {
        const updatedUser = await this.prisma.user.update({
            where: { id },
            data: updateUserDto,
        });

        const { password, ...result } = updatedUser;
        return result;
    } catch (error) {
        throw new NotFoundException(`No se pudo actualizar el usuario con ID ${id}.`);
    }
  }

  /**
   * @method remove
   * @description Elimina un usuario del sistema.
   * @param {string} id - ID del usuario a eliminar.
   * @param {User} currentUser - El usuario que realiza la operación.
   * @returns {Promise<Omit<User, 'password'>>} El usuario que fue eliminado.
   * @throws {ForbiddenException} Si un usuario intenta eliminarse a sí mismo.
   * @throws {NotFoundException} Si el usuario a eliminar no existe.
   */
  async remove(id: string, currentUser: User): Promise<Omit<User, 'password'>> {
    if (id === currentUser.id) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta.');
    }
    try {
      const deletedUser = await this.prisma.user.delete({ where: { id } });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = deletedUser;
      return result;
    } catch (error) {
      throw new NotFoundException(`No se pudo eliminar el usuario con ID ${id}. Es posible que ya haya sido eliminado.`);
    }
  }
}