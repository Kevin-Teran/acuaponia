import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { TankStatus } from '@prisma/client';

/**
 * @desc     Obtiene todos los tanques que pertenecen al usuario autenticado.
 * @route    GET /api/tanks
 * @access   Private
 */
export const getTanks = async (req: Request, res: Response): Promise<void> => {
    // @ts-ignore
    const userId = req.user.id;

    const tanks = await prisma.tank.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: tanks });
};

/**
 * @desc     Crea un nuevo tanque y lo asocia con el usuario autenticado.
 * @route    POST /api/tanks
 * @access   Private
 */
export const createTank = async (req: Request, res: Response): Promise<void> => {
    const { name, location, status } = req.body;
    // @ts-ignore
    const userId = req.user.id;

    if (!name || !location) {
        throw new CustomError('El nombre y la ubicación son requeridos.', 400);
    }

    // Ahora, sin capacity ni currentLevel, la creación es limpia.
    const newTank = await prisma.tank.create({
        data: {
            name,
            location,
            status: (status as TankStatus) || 'ACTIVE',
            userId,
        },
    });

    logger.info(`Tanque creado: ${newTank.name} por usuario ${userId}`);
    res.status(201).json({ success: true, data: newTank });
};

/**
 * @desc     Actualiza la información de un tanque existente.
 * @route    PUT /api/tanks/:id
 * @access   Private
 */
export const updateTank = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, location, status } = req.body;
    // @ts-ignore
    const userId = req.user.id;

    const tank = await prisma.tank.findFirst({ where: { id, userId } });

    if (!tank) {
        throw new CustomError('Tanque no encontrado o no tiene permiso para editarlo.', 404);
    }

    const updatedTank = await prisma.tank.update({
        where: { id },
        data: { name, location, status: status as TankStatus },
    });

    logger.info(`Tanque actualizado: ${updatedTank.name}`);
    res.json({ success: true, data: updatedTank });
};

/**
 * @desc     Elimina un tanque y sus sensores asociados (en cascada).
 * @route    DELETE /api/tanks/:id
 * @access   Private
 */
export const deleteTank = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    // @ts-ignore
    const userId = req.user.id;

    const tank = await prisma.tank.findFirst({ where: { id, userId } });

    if (!tank) {
        throw new CustomError('Tanque no encontrado o no tiene permiso para eliminarlo.', 404);
    }
    
    await prisma.tank.delete({ where: { id } });

    logger.info(`Tanque y sus dependencias eliminadas: ${id}`);
    res.json({ success: true, message: 'Tanque eliminado correctamente' });
};

/**
 * @desc     Obtiene los tanques de un usuario específico (para vistas de administrador).
 * @route    GET /api/tanks/user/:userId
 * @access   Private (Admin)
 */
export const getTanksByUserId = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const tanks = await prisma.tank.findMany({
        where: { userId },
        orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: tanks });
};