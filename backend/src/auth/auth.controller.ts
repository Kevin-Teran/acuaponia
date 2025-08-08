import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * @controller AuthController
 * @description Gestiona las rutas relacionadas con la autenticación de usuarios,
 * como el inicio de sesión y la obtención de información del perfil.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * @route   POST /api/auth/login
   * @desc    Autentica a un usuario y devuelve sus datos junto con los tokens de acceso y refresco.
   * @param   {LoginDto} loginDto - Objeto con las credenciales del usuario (email, password, rememberMe).
   * @returns {Promise<{user: any, accessToken: string, refreshToken: string}>} El usuario y sus tokens.
   * @access  Public
   */
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password, loginDto.rememberMe);
  }

  /**
   * @route   GET /api/auth/me
   * @desc    Obtiene el perfil del usuario actualmente autenticado a través del token JWT.
   * @param   {Request} req - El objeto de la petición, con la propiedad `user` añadida por el guard.
   * @returns {Promise<Omit<User, 'password'>>} Los datos del usuario sin la contraseña.
   * @access  Private (Requiere token JWT válido)
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req) {
    const { password, ...user } = req.user;
    return user;
  }
}