import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { TankStatus } from '@prisma/client';

/**
 * @desc     Obtiene todos los tanques del usuario autenticado.
 * @route    GET /api/tanks
 * @access   Private
 */
export const getTanks = async (req: Request, res: Response) => {
    // @ts-ignore - Se asume que req.user.id es inyectado por el middleware de autenticación
    const userId = req.user.id;

    if (!userId) {
        throw new CustomError('No autorizado', 401);
    }

    const tanks = await prisma.tank.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: tanks });
};

/**
 * @desc     Crea un nuevo tanque.
 * @route    POST /api/tanks
 * @access   Private
 */
export const createTank = async (req: Request, res: Response) => {
    const { name, location, capacity, currentLevel } = req.body;
    // @ts-ignore
    const userId = req.user.id;

    const newTank = await prisma.tank.create({
        data: { name, location, capacity, currentLevel, userId, status: 'ACTIVE' },
    });

    logger.info(`Tanque creado: ${newTank.name} por usuario ${userId}`);
    res.status(201).json({ success: true, data: newTank });
};

/**
 * @desc     Actualiza un tanque existente.
 * @route    PUT /api/tanks/:id
 * @access   Private
 */
export const updateTank = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, location, capacity, currentLevel, status } = req.body;

    const updatedTank = await prisma.tank.update({
        where: { id },
        data: { name, location, capacity, currentLevel, status: status as TankStatus },
    });

    logger.info(`Tanque actualizado: ${updatedTank.name}`);
    res.json({ success: true, data: updatedTank });
};

/**
 * @desc     Elimina un tanque y sus sensores asociados en cascada.
 * @route    DELETE /api/tanks/:id
 * @access   Private
 */
export const deleteTank = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    // La eliminación en cascada se define en el schema de Prisma.
    await prisma.tank.delete({ where: { id } });

    logger.info(`Tanque y sus dependencias eliminadas: ${id}`);
    res.json({ success: true, message: 'Tanque eliminado correctamente' });
};