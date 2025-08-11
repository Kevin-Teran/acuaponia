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
   * @description Busca un usuario por email (usado internamente por AuthService).
   */
  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  /**
   * @method update
   * @description Actualiza un usuario.
   */
  async update(id: string, updateUserDto: UpdateUserDto, currentUser: User): Promise<Omit<User, 'password'>> {
    if (id === currentUser.id) {
      if (updateUserDto.role && updateUserDto.role !== currentUser.role) {
        throw new ForbiddenException('No puedes cambiar tu propio rol.');
      }
      if (updateUserDto.status && updateUserDto.status !== currentUser.status) {
        throw new ForbiddenException('No puedes cambiar tu propio estado.');
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
   * @description Elimina un usuario.
   */
  async remove(id: string, currentUser: User): Promise<User> {
    if (id === currentUser.id) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta.');
    }
    try {
      return await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      throw new NotFoundException(`No se pudo eliminar el usuario con ID ${id}. Es posible que ya haya sido eliminado.`);
    }
  }
}