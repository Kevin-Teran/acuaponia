import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { User } from '../entities/user.entity';

/**
 * @typedef {Object} LoginResponse
 * @property {string} access_token - Token JWT de acceso
 * @property {User} user - Información del usuario
 */
interface LoginResponse {
  access_token: string;
  user: User;
}

/**
 * @typedef {Object} JwtPayload
 * @property {string} sub - ID del usuario
 * @property {string} email - Email del usuario
 * @property {string} role - Rol del usuario
 */
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * Servicio de autenticación
 * @class AuthService
 * @description Maneja la autenticación de usuarios y generación de tokens JWT
 */
@Injectable()
export class AuthService {
  /**
   * Constructor del servicio de autenticación
   * @param {UsersService} usersService - Servicio de usuarios
   * @param {JwtService} jwtService - Servicio JWT
   */
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Valida las credenciales de un usuario
   * @async
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @returns {Promise<User | null>} Usuario si las credenciales son válidas, null en caso contrario
   * @throws {UnauthorizedException} Si las credenciales son inválidas
   * @example
   * const user = await authService.validateUser('user@example.com', 'password123');
   */
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    
    if (user && await bcrypt.compare(password, user.password)) {
      const { password: _, ...result } = user;
      return result as User;
    }
    
    return null;
  }

  /**
   * Realiza el login de un usuario
   * @async
   * @param {User} user - Usuario a autenticar
   * @returns {Promise<LoginResponse>} Respuesta con token y datos del usuario
   * @example
   * const loginResponse = await authService.login(user);
   * // { access_token: 'jwt-token', user: { id: '...', email: '...', ... } }
   */
  async login(user: User): Promise<LoginResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // Actualizar último login
    await this.usersService.updateLastLogin(user.id);

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }

  /**
   * Registra un nuevo usuario
   * @async
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña del usuario
   * @param {string} name - Nombre del usuario
   * @returns {Promise<LoginResponse>} Respuesta con token y datos del usuario
   * @throws {Error} Si el email ya está registrado
   * @example
   * const response = await authService.register('user@example.com', 'password123', 'John Doe');
   */
  async register(email: string, password: string, name: string): Promise<LoginResponse> {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      name,
    });

    return this.login(user);
  }

  /**
   * Verifica y decodifica un token JWT
   * @async
   * @param {string} token - Token JWT a verificar
   * @returns {Promise<JwtPayload>} Payload del token
   * @throws {UnauthorizedException} Si el token es inválido
   * @example
   * const payload = await authService.verifyToken('jwt-token');
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Token inválido');
    }
  }
}