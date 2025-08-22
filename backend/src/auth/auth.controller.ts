import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { ResponseUtil } from '../common/utils/response.util';

/**
 * @typedef {Object} LoginDto
 * @property {string} email - Email del usuario
 * @property {string} password - Contraseña del usuario
 */
class LoginDto {
  email: string;
  password: string;
}

/**
 * @typedef {Object} RegisterDto
 * @property {string} email - Email del usuario
 * @property {string} password - Contraseña del usuario
 * @property {string} name - Nombre completo del usuario
 */
class RegisterDto {
  email: string;
  password: string;
  name: string;
}

/**
 * Controlador de autenticación
 * @class AuthController
 * @description Maneja las rutas de autenticación (login, registro)
 */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  /**
   * Constructor del controlador de autenticación
   * @param {AuthService} authService - Servicio de autenticación
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint para iniciar sesión
   * @async
   * @param {any} req - Request object con usuario validado
   * @returns {Promise<any>} Respuesta con token de acceso
   * @example
   * POST /auth/login
   * Body: { "email": "user@example.com", "password": "password123" }
   */
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login exitoso' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Request() req: any) {
    const result = await this.authService.login(req.user);
    return ResponseUtil.success(result, 'Login exitoso');
  }

  /**
   * Endpoint para registrar un nuevo usuario
   * @async
   * @param {RegisterDto} registerDto - Datos de registro
   * @returns {Promise<any>} Respuesta con token de acceso
   * @example
   * POST /auth/register
   * Body: { "email": "user@example.com", "password": "password123", "name": "John Doe" }
   */
  @Post('register')
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Usuario registrado exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.name,
    );
    return ResponseUtil.success(result, 'Usuario registrado exitosamente');
  }
}