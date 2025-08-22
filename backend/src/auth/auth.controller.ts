/**
 * @file auth.controller.ts
 * @description Controlador para gestionar la autenticación de usuarios.
 */
 import { Controller, Post, Body, Get, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
 import { AuthService } from './auth.service';
 import { LoginDto } from './dto/login.dto';
 import { JwtAuthGuard } from './guards/jwt-auth.guard';
 import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
 import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
 
 /**
  * @controller AuthController
  * @description Gestiona las rutas de autenticación, incluyendo inicio de sesión,
  * obtención del perfil de usuario y refresco de tokens de acceso.
  * @path /auth
  */
 @ApiTags('Autenticación')
 @Controller('auth')
 export class AuthController {
   constructor(private readonly authService: AuthService) {}
 
   /**
    * @route   POST /auth/login
    * @desc    Autentica a un usuario y devuelve sus datos junto con los tokens.
    * @param   {LoginDto} loginDto - Credenciales del usuario.
    * @returns {Promise<object>} El usuario (sin contraseña) y sus tokens.
    * @access  Público
    */
   @Post('login')
   @HttpCode(HttpStatus.OK)
   @ApiOperation({ summary: 'Iniciar sesión de usuario' })
   @ApiResponse({ status: 200, description: 'Autenticación exitosa.' })
   @ApiResponse({ status: 401, description: 'Credenciales incorrectas.' })
   @ApiResponse({ status: 403, description: 'La cuenta del usuario no está activa.' })
   login(@Body() loginDto: LoginDto) {
     return this.authService.login(loginDto.email, loginDto.password, loginDto.rememberMe);
   }
 
   /**
    * @route   GET /auth/me
    * @desc    Obtiene el perfil del usuario autenticado.
    * @param   {any} req - El objeto de la petición con el usuario.
    * @returns {Omit<User, 'password'>} Los datos del usuario sin la contraseña.
    * @access  Privado (Requiere token de acceso)
    */
   @UseGuards(JwtAuthGuard)
   @Get('me')
   @ApiBearerAuth()
   @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
   @ApiResponse({ status: 200, description: 'Perfil del usuario obtenido con éxito.' })
   @ApiResponse({ status: 401, description: 'No autorizado.' })
   getProfile(@Req() req) {
     return req.user;
   }
 
   /**
    * @route   POST /auth/refresh
    * @desc    Genera un nuevo token de acceso usando un token de refresco.
    * @param   {any} req - La petición con el usuario adjunto.
    * @returns {Promise<{accessToken: string}>} Un objeto con el nuevo token de acceso.
    * @access  Privado (Requiere token de refresco)
    */
   @UseGuards(JwtRefreshGuard)
   @Post('refresh')
   @HttpCode(HttpStatus.OK)
   @ApiBearerAuth('JWT-refresh')
   @ApiOperation({ summary: 'Refrescar token de acceso' })
   @ApiResponse({ status: 200, description: 'Token de acceso refrescado exitosamente.' })
   @ApiResponse({ status: 401, description: 'Token de refresco inválido o expirado.' })
   refreshToken(@Req() req) {
     const userId = req.user.sub;
     const refreshToken = req.headers.authorization.split(' ')[1];
     return this.authService.refreshToken(userId, refreshToken);
   }
 }