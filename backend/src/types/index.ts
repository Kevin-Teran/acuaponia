import { Request } from 'express';
import { Role } from '@prisma/client';

/**
 * @interface AuthenticatedRequest
 * @desc Extiende la interfaz de Request de Express para incluir la propiedad `user`,
 * que es añadida por el middleware de autenticación (`protect`).
 */
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: Role;
  };
}