import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard de autenticación local
 * @class LocalAuthGuard
 * @extends AuthGuard
 * @description Protege rutas que requieren autenticación con email/password
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}