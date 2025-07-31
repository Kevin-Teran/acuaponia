import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { Role } from '@prisma/client';


interface AuthenticatedRequest extends Request {
  user: { id: string; role: Role; email: string; };
}


/**
 * @desc     Obtiene los tanques asignados al usuario actualmente autenticado.
 * La vista es la misma para usuarios y administradores en este endpoint.
 * @route    GET /api/tanks
 * @access   Private
 */
 export const getTanks = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id: userId } = req.user;

        const tanks = await prisma.tank.findMany({
            where: { userId }, // Siempre filtra por el usuario logueado
            include: {
                user: { select: { id: true, name: true, email: true } },
                _count: { select: { sensors: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, data: tanks });
    } catch (error: unknown) {
        logger.error('Error en getTanks:', error);
        throw new CustomError('Error al obtener los tanques', 500);
    }
};

/**
 * @desc     Crea un nuevo tanque. Se asigna automáticamente al usuario que lo crea.
 * Un admin puede opcionalmente asignarlo a otro usuario.
 * @route    POST /api/tanks
 * @access   Private
 */
export const createTank = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, location, status = 'ACTIVE' } = req.body;
        let { userId } = req.body;
        const currentUser = req.user;

        // Si no es admin, no puede asignar el tanque a otro usuario
        if (currentUser.role !== 'ADMIN') {
            userId = currentUser.id;
        } else if (!userId) {
            userId = currentUser.id;
        }

        const tank = await prisma.tank.create({
            data: { name, location, status, userId },
            include: { user: { select: { id: true, name: true } } }
        });

        logger.info(`Tanque creado: ${tank.name} por usuario ${currentUser.id}`);
        res.status(201).json({ success: true, data: tank, message: 'Tanque creado exitosamente.' });
    } catch (error: any) {
        logger.error('Error en createTank:', error);
        if (error.code === 'P2002') { // Error de restricción única (nombre de tanque por usuario)
            throw new CustomError('Ya existe un tanque con este nombre.', 409);
        }
        throw new CustomError('Error al crear el tanque.', 500);
    }
};

/**
 * @desc     Actualiza un tanque. Solo el propietario o un admin pueden hacerlo.
 * @route    PUT /api/tanks/:id
 * @access   Private
 */
export const updateTank = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { name, location, status } = req.body;
    const { id: userId, role } = req.user;

    const tank = await prisma.tank.findUnique({ where: { id } });

    if (!tank) {
        throw new CustomError('Tanque no encontrado', 404);
    }

    if (role !== 'ADMIN' && tank.userId !== userId) {
        throw new CustomError('No tiene permisos para modificar este tanque', 403);
    }

    const updatedTank = await prisma.tank.update({
        where: { id },
        data: { name, location, status },
    });

    logger.info(`Tanque actualizado: ${updatedTank.name} (ID: ${id}) por usuario ${userId}`);
    res.json({ success: true, data: updatedTank, message: 'Tanque actualizado correctamente.' });
};

/**
 * @desc     Elimina un tanque. Solo el propietario o un admin pueden hacerlo.
 * @route    DELETE /api/tanks/:id
 * @access   Private
 */
export const deleteTank = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const tank = await prisma.tank.findUnique({
        where: { id },
        include: { _count: { select: { sensors: true } } }
    });

    if (!tank) {
        throw new CustomError('Tanque no encontrado', 404);
    }

    if (role !== 'ADMIN' && tank.userId !== userId) {
        throw new CustomError('No tiene permisos para eliminar este tanque', 403);
    }
    
    if (tank._count.sensors > 0) {
        throw new CustomError('No se puede eliminar. Elimine primero los sensores asociados.', 400);
    }

    await prisma.tank.delete({ where: { id } });
    logger.info(`Tanque eliminado: ${tank.name} (ID: ${id}) por usuario ${userId}`);
    res.json({ success: true, message: 'Tanque eliminado exitosamente.' });
};


// Las siguientes funciones (getTankById, getTanksByUserId) ya manejan bien los permisos
// o son exclusivas de admin, por lo que no requieren cambios drásticos.

/**
 * @desc     Obtiene un tanque por su ID. Verifica propiedad si no es admin.
 * @route    GET /api/tanks/:id
 * @access   Private
 */
export const getTankById = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const tank = await prisma.tank.findUnique({ where: { id } });

    if (!tank) {
        throw new CustomError('Tanque no encontrado', 404);
    }

    if (role !== 'ADMIN' && tank.userId !== userId) {
        throw new CustomError('Acceso no autorizado', 403);
    }

    res.json({ success: true, data: tank });
};

/**
 * @desc     (Admin) Obtiene los tanques de un usuario específico.
 * @route    GET /api/tanks/user/:userId
 * @access   Private (Admin Only)
 */
export const getTanksByUserId = async (req: Request, res: Response) => {
    // Esta ruta ya está protegida por el middleware `admin`
    const { userId } = req.params;
    const tanks = await prisma.tank.findMany({ where: { userId } });
    res.json({ success: true, data: tanks });
};