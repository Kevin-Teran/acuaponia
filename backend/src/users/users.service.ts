import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/types';

/**
 * @typedef {Object} CreateUserDto
 * @property {string} email - Email del usuario
 * @property {string} password - Contraseña hasheada
 * @property {string} name - Nombre del usuario
 * @property {UserRole} [role] - Rol del usuario
 */
interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
}

/**
 * Servicio de usuarios
 * @class UsersService
 * @description Maneja las operaciones CRUD de usuarios
 */
@Injectable()
export class UsersService {
  /**
   * Constructor del servicio de usuarios
   * @param {Repository<User>} userRepository - Repositorio de usuarios
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Crea un nuevo usuario
   * @async
   * @param {CreateUserDto} createUserDto - Datos del usuario a crear
   * @returns {Promise<User>} Usuario creado
   * @throws {ConflictException} Si el email ya existe
   * @example
   * const user = await usersService.create({
   *   email: 'user@example.com',
   *   password: 'hashedPassword',
   *   name: 'John Doe'
   * });
   */
  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const user = this.userRepository.create(createUserDto);
    return await this.userRepository.save(user);
  }

  /**
   * Busca todos los usuarios con paginación
   * @async
   * @param {number} [page=1] - Número de página
   * @param {number} [limit=10] - Elementos por página
   * @returns {Promise<{ users: User[]; total: number }>} Lista de usuarios y total
   * @example
   * const result = await usersService.findAll(1, 10);
   * // { users: [...], total: 25 }
   */
  async findAll(page: number = 1, limit: number = 10): Promise<{ users: User[]; total: number }> {
    const [users, total] = await this.userRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { users, total };
  }

  /**
   * Busca un usuario por ID
   * @async
   * @param {string} id - ID del usuario
   * @returns {Promise<User>} Usuario encontrado
   * @throws {NotFoundException} Si el usuario no existe
   * @example
   * const user = await usersService.findById('user-uuid');
   */
  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['tanks'],
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  /**
   * Busca un usuario por email
   * @async
   * @param {string} email - Email del usuario
   * @returns {Promise<User | null>} Usuario encontrado o null
   * @example
   * const user = await usersService.findByEmail('user@example.com');
   */
  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { email },
    });
  }

  /**
   * Actualiza la fecha del último login
   * @async
   * @param {string} id - ID del usuario
   * @returns {Promise<void>}
   * @example
   * await usersService.updateLastLogin('user-uuid');
   */
  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, {
      lastLogin: new Date(),
    });
  }

  /**
   * Elimina un usuario
   * @async
   * @param {string} id - ID del usuario
   * @returns {Promise<void>}
   * @throws {NotFoundException} Si el usuario no existe
   * @example
   * await usersService.remove('user-uuid');
   */
  async remove(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }
  }
}