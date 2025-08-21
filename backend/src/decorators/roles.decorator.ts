/**
 * @file roles.decorator.ts
 * @description Decorador personalizado para asignar los roles requeridos a un endpoint.
 * Permite aplicar control de acceso basado en roles de una manera declarativa y legible.
 * @version 1.0.0
 */
 import { SetMetadata } from '@nestjs/common';
 import { Role } from '@prisma/client'; 
 
 // Clave única para almacenar y recuperar los metadatos de roles.
 export const ROLES_KEY = 'roles';
 
 /**
  * @description Decorador que adjunta un array de roles a la metadata de un controlador o método.
  * @param {...Role[]} roles - Una lista de roles que tienen permiso para acceder al recurso.
  * @returns Un decorador de metadatos.
  */
 export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);