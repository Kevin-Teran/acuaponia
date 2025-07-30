import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { asyncHandler, CustomError } from './errorHandler';
import { Role } from '@prisma/client';

/**
 * @desc Middleware para proteger rutas que requieren autenticación.
 * Verifica la validez de un token JWT en el encabezado de la autorización.
 * Si el token es válido, adjunta la información del usuario a `req.user`.
 * @param {Request} req - El objeto de la solicitud de Express.
 * @param {Response} res - El objeto de la respuesta de Express.
 * @param {NextFunction} next - La función para pasar al siguiente middleware.
 * @throws {CustomError} Si no hay token, el token es inválido o el usuario no se encuentra.
 */
export const protect = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extraer el token del encabezado (formato: "Bearer TOKEN")
            token = req.headers.authorization.split(' ')[1];
            
            // Verificar y decodificar el token usando el secreto
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };

            // Buscar el usuario en la base de datos con el ID del token
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId },
                select: { 
                    id: true, 
                    email: true, 
                    name: true,
                    role: true, 
                    status: true 
                }
            });

            // Si el usuario no existe o no está activo, el token ya no es válido
            if (!user || user.status !== 'ACTIVE') {
                throw new CustomError('No autorizado, el token de usuario ya no es válido.', 401);
            }
            
            // @ts-ignore - Se añade la propiedad 'user' al objeto Request.
            // En una configuración completa, esto se manejaría con un archivo de declaración de tipos.
            req.user = user;
            
            next(); // El usuario está autenticado, continuar a la siguiente función.
        } catch (error) {
            throw new CustomError('No autorizado, el token falló o ha expirado.', 401);
        }
    }

    if (!token) {
        throw new CustomError('No autorizado, no se encontró un token en la petición.', 401);
    }
});

/**
 * @desc Middleware para restringir el acceso solo a usuarios con el rol de 'ADMIN'.
 * Debe usarse siempre DESPUÉS del middleware `protect`.
 * @param {Request} req - El objeto de la solicitud de Express (ya debe tener `req.user`).
 * @param {Response} res - El objeto de la respuesta de Express.
 * @param {NextFunction} next - La función para pasar al siguiente middleware.
 * @throws {CustomError} Si el usuario no es un administrador.
 */
export const admin = (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore - Se accede a la propiedad 'user' que fue añadida por el middleware 'protect'.
    if (req.user && req.user.role === 'ADMIN') {
        next(); // El usuario es admin, puede continuar.
    } else {
        throw new CustomError('Acceso denegado. Se requiere rol de Administrador.', 403); // 403 Forbidden
    }
};
