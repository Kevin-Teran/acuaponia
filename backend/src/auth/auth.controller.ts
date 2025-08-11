import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { User } from '@prisma/client';
import { RefreshTokenDto } from './dto/refresh-token.dto';

/**
 * @controller AuthController
 * @description Gestiona las rutas relacionadas con la autenticación de usuarios,
 * como el inicio de sesión, la obtención del perfil y el refresco de tokens.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * @route   POST /api/auth/login
   * @desc    Autentica a un usuario y devuelve sus datos junto con los tokens de acceso y refresco.
   * @param   {LoginDto} loginDto - Objeto con las credenciales del usuario (email, password, rememberMe).
   * @returns {Promise<{user: any, tokens: {accessToken: string, refreshToken: string}}>} El usuario y sus tokens.
   * @access  Publico
   */
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password, loginDto.rememberMe);
  }

  /**
   * @route   GET /api/auth/me
   * @desc    Obtiene el perfil del usuario actualmente autenticado a través del token JWT de acceso.
   * @param   {Request} req - El objeto de la petición, con la propiedad `user` añadida por el guard.
   * @returns {Promise<Omit<User, 'password'>>} Los datos del usuario sin la contraseña.
   * @access  Privado (Requiere token de acceso JWT válido)
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req) {
    return req.user;
  }
  
  /**
   * @route   POST /api/auth/refresh
   * @desc    Genera un nuevo token de acceso usando un token de refresco válido.
   * @param   {Request} req - La petición con el usuario adjunto por el JwtRefreshGuard.
   * @returns {Promise<{accessToken: string}>} Un objeto con el nuevo token de acceso.
   * @access  Privado (Requiere token de refresco JWT válido)
   */
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  refreshToken(@Req() req, @Body() body: RefreshTokenDto) {
    // req.user es poblado por JwtRefreshStrategy después de validar el token de refresco.
    return this.authService.refreshToken(req.user as User);
  }
}