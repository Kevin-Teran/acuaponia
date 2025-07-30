import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { asyncHandler, CustomError } from './errorHandler';
import { Role } from '@prisma/client';

/**
 * @desc Middleware para proteger rutas. Verifica el token JWT y adjunta el payload del usuario a 'req'.
 * @access Private
 */
export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                // Selecciona solo los campos definidos en UserPayload
                select: { 
                    id: true, 
                    email: true, 
                    name: true,
                    role: true, 
                    status: true 
                }
            });

            if (!user) {
                throw new CustomError('No autorizado, el usuario del token ya no existe.', 401);
            }
            
            // Ahora 'user' coincide perfectamente con el tipo UserPayload global
            req.user = user;
            next();
        } catch (error) {
            throw new CustomError('No autorizado, token fallido o inválido.', 401);
        }
    }

    if (!token) {
        throw new CustomError('No autorizado, no se encontró un token.', 401);
    }
});

/**
 * @desc Middleware para restringir acceso solo a administradores.
 * @access Private (Admin Only)
 */
export const admin = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'ADMIN') {
        next();
    } else {
        throw new CustomError('Acceso denegado. Se requiere rol de administrador.', 403);
    }
};