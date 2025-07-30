import { Role, UserStatus } from '@prisma/client';

/**
 * @interface UserPayload
 * @desc Define la estructura de los datos del usuario que se adjuntarán al objeto Request.
 * Contiene solo la información esencial y segura.
 */
interface UserPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
}

// Extiende la interfaz Request de Express de forma global y única
declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}