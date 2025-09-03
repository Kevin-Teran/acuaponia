/**
 * @file dashboard-filters.dto.ts
 * @route 
 * @description  Asigna los roles permitidos a un endpoint específico. Se usa junto con el RolesGuard para proteger rutas
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';
/**
 * @decorator Roles
 * @description Asigna los roles permitidos a un endpoint específico.
 * Se usa junto con el RolesGuard para proteger rutas.
 * @param {...Role[]} roles - Una lista de roles permitidos (ej. 'ADMIN', 'USER').
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);