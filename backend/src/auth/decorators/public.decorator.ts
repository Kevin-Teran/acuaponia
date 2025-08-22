/**
 * @file public.decorator.ts
 * @description Decorador para marcar rutas como públicas y eximirlas de la autenticación JWT global.
 * @author Sistema de Acuaponía SENA
 * @version 2.0.0
 * @since 1.0.0
 */

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * @function Public
 * @description Decorador que permite que una ruta sea accesible sin un token JWT válido.
 * Se utiliza en conjunto con un guardián de autenticación global.
 * @example
 * @Public()
 * @Get('/login')
 * loginEndpoint() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);