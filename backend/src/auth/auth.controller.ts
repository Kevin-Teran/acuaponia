/**
 * @file auth.controller.ts
 * @description Controlador REST para endpoints de autenticación y autorización.
 * Expone rutas protegidas y públicas para el sistema de acuaponía.
 * @author Sistema de Acuaponía SENA
 * @version 3.0.0
 * @since 1.0.0
 */

 import { 
  Controller, 
  Post, 
  Get, 
  UseGuards, 
  Request, 
  Body, 
  HttpStatus,
  HttpCode,
  Logger,
  BadRequestException,
  UnauthorizedException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard'; 
import { RolesGuard } from './guards/roles.guard';  
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@prisma/client';

/**
 * @typedef {Object} AuthenticatedRequest
 * @property {UserPayload} user - Usuario autenticado
 */
interface AuthenticatedRequest extends Request {
  user: UserPayload;
  ip?: string;
}

/**
 * @typedef {Object} UserPayload
 * @property {string} id - ID único del usuario
 * @property {string} email - Correo electrónico del usuario
 * @property {string} name - Nombre completo del usuario
 * @property {Role} role - Rol del usuario en el sistema
 */
interface UserPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/**
 * @typedef {Object} LoginResponse
 * @property {string} access_token - Token de acceso JWT
 * @property {string} refresh_token - Token de actualización (opcional)
 * @property {UserInfo} user - Información básica del usuario
 * @property {number} expires_in - Tiempo de expiración en segundos
 * @property {string} message - Mensaje de respuesta
 */
interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
  };
  expires_in: number;
  message: string;
}

/**
 * @typedef {Object} ProfileResponse
 * @property {UserPayload} user - Información completa del perfil
 * @property {Date} lastLogin - Última fecha de acceso
 * @property {UserStats} stats - Estadísticas del usuario
 */
interface ProfileResponse {
  user: UserPayload;
  lastLogin?: Date;
  stats?: {
    tanksCount: number;
    alertsCount: number;
    reportsCount: number;
  };
}

/**
 * @class AuthController
 * @description Controlador que maneja todos los endpoints relacionados con autenticación.
 * Incluye login, obtención de perfil, renovación de tokens y rutas protegidas por rol.
 */
@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  /** @private {Logger} logger - Logger específico para este controlador */
  private readonly logger = new Logger(AuthController.name);

  /**
   * @constructor
   * @description Inicializa el controlador con el servicio de autenticación.
   * @param {AuthService} authService - Servicio que maneja la lógica de autenticación
   */
  constructor(private readonly authService: AuthService) {}

  /**
   * @method login
   * @description Endpoint para autenticar usuarios con email y contraseña.
   * Utiliza la estrategia local de Passport para validar credenciales.
   * @param {AuthenticatedRequest} req - Request con usuario validado por LocalStrategy
   * @param {LoginDto} loginDto - DTO con credenciales y opciones de login
   * @returns {Promise<LoginResponse>} Respuesta con token de acceso y datos del usuario
   * @throws {UnauthorizedException} Cuando las credenciales son incorrectas
   * @throws {BadRequestException} Cuando faltan datos requeridos
   * @example
   * POST /auth/login
   * {
   * "email": "admin@sena.edu.co",
   * "password": "password123",
   * "rememberMe": true
   * }
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('local'))
  @ApiOperation({ 
    summary: 'Iniciar sesión en el sistema',
    description: 'Autentica un usuario con email y contraseña, retornando un token JWT válido.'
  })
  @ApiBody({ 
    type: LoginDto,
    description: 'Credenciales del usuario',
    examples: {
      admin: {
        summary: 'Login de administrador',
        value: {
          email: 'admin@sena.edu.co',
          password: 'password123',
          rememberMe: true
        }
      },
      user: {
        summary: 'Login de usuario regular',
        value: {
          email: 'usuario@sena.edu.co',
          password: 'password123',
          rememberMe: false
        }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Login exitoso',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'clp123abc456',
          email: 'admin@sena.edu.co',
          name: 'Administrador Sistema',
          role: 'ADMIN'
        },
        expires_in: 3600,
        message: 'Inicio de sesión exitoso'
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Credenciales incorrectas',
    schema: {
      example: {
        statusCode: 401,
        message: 'Credenciales incorrectas. Verifique su email y contraseña.',
        error: 'Unauthorized'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
    schema: {
      example: {
        statusCode: 400,
        message: ['email must be a valid email', 'password should not be empty'],
        error: 'Bad Request'
      }
    }
  })
  async login(
    @Request() req: AuthenticatedRequest, 
    @Body() loginDto: LoginDto
  ): Promise<LoginResponse> {
    try {
      if (!req.user) {
        throw new UnauthorizedException('Usuario no autenticado');
      }

      const authResult = await this.authService.login(req.user, loginDto.rememberMe);
      
      const response: LoginResponse = {
        ...authResult,
        message: 'Inicio de sesión exitoso'
      };

      this.logger.log(`Login exitoso para usuario: ${req.user.email} (${req.user.role})`);
      
      return response;

    } catch (error) {
      this.logger.warn(`Intento de login fallido: ${error.message}`, {
        email: loginDto.email,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      
      throw new BadRequestException('Error durante el proceso de autenticación');
    }
  }

  /**
   * @method getProfile
   * @description Obtiene el perfil del usuario autenticado.
   * Requiere token JWT válido en el header Authorization.
   * @param {AuthenticatedRequest} req - Request con usuario autenticado
   * @returns {Promise<ProfileResponse>} Información completa del perfil del usuario
   * @throws {UnauthorizedException} Cuando el token es inválido o ha expirado
   * @example
   * GET /auth/profile
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Obtener perfil del usuario autenticado',
    description: 'Retorna la información completa del perfil del usuario autenticado, incluyendo estadísticas básicas.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Perfil obtenido exitosamente',
    schema: {
      example: {
        user: {
          userId: 'clp123abc456',
          email: 'admin@sena.edu.co',
          name: 'Administrador Sistema',
          role: 'ADMIN'
        },
        lastLogin: '2024-01-15T10:30:00.000Z',
        stats: {
          tanksCount: 5,
          alertsCount: 12,
          reportsCount: 8
        }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Token inválido o expirado' 
  })
  async getProfile(@Request() req: AuthenticatedRequest): Promise<ProfileResponse> {
    try {
      const userProfile: ProfileResponse = {
        user: req.user,
        lastLogin: new Date(), 
        stats: {
          tanksCount: 0, 
          alertsCount: 0,
          reportsCount: 0
        }
      };

      this.logger.log(`Perfil consultado por usuario: ${req.user.email}`);
      return userProfile;

    } catch (error) {
      this.logger.error(`Error obteniendo perfil: ${error.message}`, error.stack);
      throw new BadRequestException('Error al obtener el perfil del usuario');
    }
  }

  /**
   * @method refreshToken
   * @description Renueva un token de acceso usando un refresh token válido.
   * @param {RefreshTokenDto} refreshTokenDto - DTO con el refresh token
   * @returns {Promise<{access_token: string, expires_in: number}>} Nuevo token de acceso
   * @throws {UnauthorizedException} Cuando el refresh token es inválido
   * @example
   * POST /auth/refresh
   * {
   * "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   * }
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Renovar token de acceso',
    description: 'Utiliza un refresh token válido para generar un nuevo token de acceso sin requerir credenciales.'
  })
  @ApiBody({ 
    type: RefreshTokenDto,
    description: 'Token de actualización',
    examples: {
      refresh: {
        summary: 'Renovar token',
        value: {
          refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Token renovado exitosamente',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        expires_in: 3600
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Refresh token inválido o expirado' 
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      const result = await this.authService.refreshToken(refreshTokenDto.refresh_token);
      
      this.logger.log('Token renovado exitosamente');
      return result;

    } catch (error) {
      this.logger.warn(`Intento de renovación con token inválido: ${error.message}`);
      throw error;
    }
  }

  /**
   * @method getAdminDashboard
   * @description Endpoint protegido solo para usuarios con rol ADMIN.
   * Demuestra el uso de guards de roles para autorización.
   * @param {AuthenticatedRequest} req - Request con usuario autenticado
   * @returns {Promise<{message: string, user: UserPayload}>} Mensaje de bienvenida para admin
   * @throws {UnauthorizedException} Cuando el token es inválido
   * @throws {ForbiddenException} Cuando el usuario no tiene rol de ADMIN
   * @example
   * GET /auth/admin-dashboard
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   */
  @Get('admin-dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Acceder al dashboard de administrador',
    description: 'Endpoint protegido que solo pueden acceder usuarios con rol de ADMIN. Demuestra autorización basada en roles.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Acceso autorizado al dashboard de admin',
    schema: {
      example: {
        message: '¡Bienvenido al Dashboard de Administrador!',
        user: {
          userId: 'clp123abc456',
          email: 'admin@sena.edu.co',
          name: 'Administrador Sistema',
          role: 'ADMIN'
        },
        permissions: ['manage_users', 'view_all_tanks', 'system_config']
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Token no válido' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Usuario sin permisos de administrador' 
  })
  async getAdminDashboard(@Request() req: AuthenticatedRequest): Promise<{
    message: string;
    user: UserPayload;
    permissions: string[];
    systemInfo: {
      version: string;
      environment: string;
      uptime: string;
    };
  }> {
    try {
      this.logger.log(`Acceso a dashboard de admin por: ${req.user.email}`);
      
      return {
        message: '¡Bienvenido al Dashboard de Administrador!',
        user: req.user,
        permissions: [
          'manage_users',
          'view_all_tanks',
          'system_config',
          'generate_reports',
          'manage_sensors'
        ],
        systemInfo: {
          version: '3.0.0',
          environment: process.env.NODE_ENV || 'development',
          uptime: process.uptime().toFixed(0) + ' segundos'
        }
      };

    } catch (error) {
      this.logger.error(`Error en dashboard de admin: ${error.message}`, error.stack);
      throw new BadRequestException('Error al cargar el dashboard de administrador');
    }
  }

  /**
   * @method getUserDashboard
   * @description Endpoint para usuarios regulares (rol USER).
   * Proporciona acceso limitado a funcionalidades del sistema.
   * @param {AuthenticatedRequest} req - Request con usuario autenticado
   * @returns {Promise<{message: string, user: UserPayload, availableFeatures: string[]}>} Dashboard de usuario regular
   * @throws {UnauthorizedException} Cuando el token es inválido
   * @example
   * GET /auth/user-dashboard
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   */
  @Get('user-dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Acceder al dashboard de usuario',
    description: 'Endpoint para usuarios regulares con acceso limitado a funcionalidades específicas.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Dashboard de usuario cargado exitosamente',
    schema: {
      example: {
        message: '¡Bienvenido al Sistema de Monitoreo!',
        user: {
          userId: 'clp123abc456',
          email: 'usuario@sena.edu.co',
          name: 'Usuario Regular',
          role: 'USER'
        },
        availableFeatures: ['view_own_tanks', 'view_alerts', 'generate_basic_reports']
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Token no válido' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Acceso denegado para este rol' 
  })
  async getUserDashboard(@Request() req: AuthenticatedRequest): Promise<{
    message: string;
    user: UserPayload;
    availableFeatures: string[];
  }> {
    try {
      this.logger.log(`Acceso a dashboard de usuario por: ${req.user.email}`);
      
      return {
        message: '¡Bienvenido al Sistema de Monitoreo de Acuaponía!',
        user: req.user,
        availableFeatures: [
          'view_own_tanks',
          'view_alerts',
          'generate_basic_reports',
          'monitor_sensors',
          'update_profile'
        ]
      };

    } catch (error) {
      this.logger.error(`Error en dashboard de usuario: ${error.message}`, error.stack);
      throw new BadRequestException('Error al cargar el dashboard de usuario');
    }
  }

  /**
   * @method logout
   * @description Endpoint para cerrar sesión (logout).
   * En una implementación JWT stateless, principalmente registra el evento.
   * @param {AuthenticatedRequest} req - Request con usuario autenticado
   * @returns {Promise<{message: string}>} Confirmación de logout
   * @example
   * POST /auth/logout
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Cerrar sesión',
    description: 'Registra el evento de logout del usuario. En JWT stateless, el cliente debe descartar el token.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Sesión cerrada exitosamente',
    schema: {
      example: {
        message: 'Sesión cerrada exitosamente'
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Token no válido' 
  })
  async logout(@Request() req: AuthenticatedRequest): Promise<{message: string}> {
    try {
      this.logger.log(`Logout realizado por usuario: ${req.user.email}`);
      
      return {
        message: 'Sesión cerrada exitosamente'
      };

    } catch (error) {
      this.logger.error(`Error durante logout: ${error.message}`, error.stack);
      throw new BadRequestException('Error al cerrar la sesión');
    }
  }

  /**
   * @method validateToken
   * @description Endpoint para validar si un token sigue siendo válido.
   * Útil para verificaciones del frontend antes de hacer requests importantes.
   * @param {AuthenticatedRequest} req - Request con usuario autenticado
   * @returns {Promise<{valid: boolean, user: UserPayload, expiresAt: Date}>} Estado del token
   * @example
   * GET /auth/validate-token
   * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   */
  @Get('validate-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Validar token de acceso',
    description: 'Verifica si el token JWT proporcionado es válido y retorna información del usuario.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Token válido',
    schema: {
      example: {
        valid: true,
        user: {
          userId: 'clp123abc456',
          email: 'admin@sena.edu.co',
          name: 'Administrador Sistema',
          role: 'ADMIN'
        },
        tokenInfo: {
          type: 'Bearer',
          expiresAt: '2024-01-15T14:30:00.000Z'
        }
      }
    }
  })
  @ApiResponse({ 
    status: HttpStatus.UNAUTHORIZED, 
    description: 'Token inválido o expirado' 
  })
  async validateToken(@Request() req: AuthenticatedRequest): Promise<{
    valid: boolean;
    user: UserPayload;
    tokenInfo: {
      type: string;
      expiresAt?: Date;
    };
  }> {
    try {
      return {
        valid: true,
        user: req.user,
        tokenInfo: {
          type: 'Bearer',
          expiresAt: new Date(Date.now() + 3600 * 1000) 
        }
      };

    } catch (error) {
      this.logger.error(`Error validando token: ${error.message}`, error.stack);
      throw new BadRequestException('Error al validar el token');
    }
  }
}