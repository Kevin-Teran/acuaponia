import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * @guard JwtRefreshGuard
 * @description Un guard que protege la ruta de refresco de token, utilizando la estrategia 'jwt-refresh'.
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}