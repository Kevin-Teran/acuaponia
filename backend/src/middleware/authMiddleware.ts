import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { asyncHandler, CustomError } from './errorHandler';
import { Role } from '@prisma/client';

// Extiende la interfaz Request de Express para que TypeScript reconozca `req.user`
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: Role; // Usar el tipo Role de Prisma para consistencia
      }
    }
  }
}

/**
 * @desc Middleware para proteger rutas. Verifica el token JWT del header 'Authorization'.
 * Si el token es válido, busca al usuario en la base de datos y lo adjunta
 * al objeto `req` como `req.user`.
 * @access   Private
 */
export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { id: true, email: true, role: true }
            });

            // --- LA CORRECCIÓN CLAVE ESTÁ AQUÍ ---
            if (!user) {
                // Si Prisma devuelve null (usuario no encontrado), lanzamos un error.
                // req.user permanecerá 'undefined', lo cual es válido.
                throw new CustomError('No autorizado, usuario del token no existe.', 401);
            }

            // Si el usuario existe, lo asignamos.
            req.user = user;
            next();

        } catch (error) {
            // Este catch maneja tanto un token inválido (error de jwt.verify) como el error que lanzamos arriba.
            throw new CustomError('No autorizado, token fallido o inválido.', 401);
        }
    }

    if (!token) {
        throw new CustomError('No autorizado, no se encontró un token.', 401);
    }
});

/**
 * @desc     Middleware para restringir acceso solo a administradores.
 * Debe usarse DESPUÉS del middleware 'protect'.
 * @access   Private (Admin Only)
 */
export const admin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        throw new CustomError('Acceso denegado. Se requiere rol de administrador.', 403);
    }
};