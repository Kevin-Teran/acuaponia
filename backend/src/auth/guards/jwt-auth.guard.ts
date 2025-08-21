/**
 * @file jwt-auth.guard.ts
 * @description Guard para proteger rutas. Solo permite el acceso si se proporciona un JWT válido.
 * @version 1.0.0
 */
 import { Injectable } from '@nestjs/common';
 import { AuthGuard } from '@nestjs/passport';
 
 @Injectable()
 export class JwtAuthGuard extends AuthGuard('jwt') {}