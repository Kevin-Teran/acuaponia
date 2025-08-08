import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { User } from '@prisma/client';

/**
 * @class UsersService
 * @description Servicio que contiene la lógica de negocio para la gestión de usuarios.
 * Se encarga de todas las operaciones CRUD y las validaciones de seguridad.
 */
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * @method create
   * @description Crea un nuevo usuario, encriptando la contraseña y validando que el email no exista.
   * @returns El usuario creado, sin la contraseña.
   */
  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const existingUser = await this.prisma.user.findUnique({ where: { email: createUserDto.email.toLowerCase() } });
    if (existingUser) {
      throw new ConflictException('El correo electrónico ya está en uso.');
    }
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        email: createUserDto.email.toLowerCase(),
        password: hashedPassword,
      },
    });
    const { password, ...result } = user;
    return result;
  }

  /**
   * @method findAll
   * @description Obtiene todos los usuarios con sus datos relevantes para la tabla de gestión.
   * @returns Una lista de usuarios sin sus contraseñas.
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
   * @description Obtiene una lista simplificada de usuarios, ideal para selectores en el frontend.
   * @returns Una lista de usuarios con solo id, nombre y email.
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
   * @returns El objeto de usuario con sus tanques, sin contraseña.
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
    const { password, ...result } = user;
    return result;
  }

  /**
   * @method findByEmail
   * @description Busca un usuario por email (usado internamente por el servicio de Auth).
   * @returns El objeto de usuario completo (incluyendo contraseña).
   */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  /**
   * @method update
   * @description Actualiza un usuario. Aplica una regla de seguridad clave:
   * si un usuario está actualizando su propio perfil, se ignoran los cambios en 'role' y 'status'.
   * @param {string} id - El ID del usuario a actualizar.
   * @param {UpdateUserDto} updateUserDto - Los datos a actualizar.
   * @param {User} currentUser - El usuario que realiza la petición.
   * @returns {Promise<Omit<User, 'password'>>} El usuario actualizado, sin la contraseña.
   */
  async update(id: string, updateUserDto: UpdateUserDto, currentUser: User): Promise<Omit<User, 'password'>> {
    if (id === currentUser.id) {
      delete updateUserDto.role;
      delete updateUserDto.status;
    }

    if (updateUserDto.password) {
      if (updateUserDto.password.length < 6) {
        throw new ConflictException('La nueva contraseña debe tener al menos 6 caracteres.');
      }
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
   * @method remove
   * @description Elimina un usuario, previniendo que un usuario se elimine a sí mismo.
   * @param {string} id - El ID del usuario a eliminar.
   * @param {User} currentUser - El usuario que realiza la petición.
   * @returns {Promise<User>} El usuario que fue eliminado.
   */
  async remove(id: string, currentUser: User): Promise<User> {
    if (id === currentUser.id) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta.');
    }
    try {
      return await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundException(`No se pudo eliminar el usuario con ID ${id}. Es posible que no exista.`);
    }
  }
}