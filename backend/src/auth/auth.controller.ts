import { Controller, Post, Body, Get, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { User } from '@prisma/client';
import { RefreshTokenDto } from './dto/refresh-token.dto';

/**
 * @controller AuthController
 * @description Gestiona las rutas de autenticación, incluyendo inicio de sesión,
 * obtención del perfil de usuario y refresco de tokens de acceso.
 * @path /auth
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * @route   POST /login
   * @desc    Autentica a un usuario y devuelve sus datos junto con los tokens de acceso y refresco.
   * @param   {LoginDto} loginDto - Objeto con las credenciales del usuario (email, password, rememberMe).
   * @returns {Promise<{user: Omit<User, 'password'>, tokens: {accessToken: string, refreshToken: string}}>} El usuario (sin contraseña) y sus tokens.
   * @throws  {UnauthorizedException} Si las credenciales son incorrectas.
   * @throws  {ForbiddenException} Si la cuenta del usuario no está activa.
   * @access  Público
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password, loginDto.rememberMe);
  }

  /**
   * @route   GET /me
   * @desc    Obtiene el perfil del usuario autenticado actualmente a través del token JWT de acceso.
   * @param   {any} req - El objeto de la petición, con la propiedad `user` inyectada por el guard `JwtAuthGuard`.
   * @returns {Omit<User, 'password'>} Los datos del usuario sin la contraseña.
   * @access  Privado (Requiere token de acceso JWT válido)
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req) {
    return req.user;
  }

  /**
   * @route   POST /refresh
   * @desc    Genera un nuevo token de acceso utilizando un token de refresco válido.
   * @param   {any} req - La petición con el usuario adjunto por el `JwtRefreshGuard`.
   * @returns {Promise<{accessToken: string}>} Un objeto con el nuevo token de acceso.
   * @access  Privado (Requiere token de refresco JWT válido)
   */
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refreshToken(@Req() req) {
    const userId = req.user.sub;
    return this.authService.refreshToken(userId);
  }
}