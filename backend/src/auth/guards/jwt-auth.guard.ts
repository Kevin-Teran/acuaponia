import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard de autenticación JWT
 * @class JwtAuthGuard
 * @extends AuthGuard
 * @description Protege rutas que requieren token JWT válido
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}