import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * @desc     Obtiene todos los tanques con información de sensores
 * @route    GET /api/tanks
 * @access   Private (Admin)
 */
export const getTanks = async (req: Request, res: Response) => {
    try {
        const tanks = await prisma.tank.findMany({
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                },
                sensors: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        status: true,
                        lastReading: true,
                        hardwareId: true,
                        calibrationDate: true,
                        lastUpdate: true
                    }
                },
                _count: {
                    select: { sensors: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: tanks
        });
    } catch (error: unknown) {
        logger.error('Error obteniendo tanques:', error);
        throw new CustomError('Error al obtener los tanques', 500);
    }
};

/**
 * @desc     Obtiene un tanque por ID con todos sus detalles
 * @route    GET /api/tanks/:id
 * @access   Private (Admin)
 */
export const getTankById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const tank = await prisma.tank.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                },
                sensors: {
                    include: {
                        _count: {
                            select: { sensorData: true }
                        }
                    }
                }
            }
        });

        if (!tank) {
            throw new CustomError('Tanque no encontrado', 404);
        }

        res.json({
            success: true,
            data: tank
        });
    } catch (error: unknown) {
        if (error instanceof CustomError) {
            throw error;
        }
        logger.error('Error obteniendo tanque por ID:', error);
        throw new CustomError('Error al obtener el tanque', 500);
    }
};

/**
 * @desc     Crea un nuevo tanque
 * @route    POST /api/tanks
 * @access   Private (Admin)
 */
export const createTank = async (req: Request, res: Response) => {
    try {
        const { name, location, userId, status = 'ACTIVE' } = req.body;
        // @ts-ignore
        const currentUserId = req.user?.id;

        if (!name || !location) {
            throw new CustomError('Nombre y ubicación son requeridos', 400);
        }

        // CORRECCIÓN: Si no se proporciona userId, usar el usuario actual
        const assignedUserId = userId || currentUserId;

        // Verificar que el usuario existe
        const userExists = await prisma.user.findUnique({
            where: { id: assignedUserId }
        });

        if (!userExists) {
            throw new CustomError('Usuario asignado no encontrado', 404);
        }

        // Verificar que no existe un tanque con el mismo nombre para el usuario
        const existingTank = await prisma.tank.findFirst({
            where: { 
                name: name.trim(),
                userId: assignedUserId 
            }
        });

        if (existingTank) {
            throw new CustomError('Ya existe un tanque con este nombre para este usuario', 409);
        }

        const tank = await prisma.tank.create({
            data: {
                name: name.trim(),
                location: location.trim(),
                status,
                userId: assignedUserId
            },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                },
                _count: {
                    select: { sensors: true }
                }
            }
        });

        logger.info(`Tanque creado: ${tank.name} por usuario ${currentUserId}`);

        res.status(201).json({
            success: true,
            data: tank,
            message: 'Tanque creado exitosamente'
        });
    } catch (error: unknown) {
        if (error instanceof CustomError) {
            throw error;
        }

        // Manejar errores específicos de Prisma
        if (error && typeof error === 'object' && 'code' in error) {
            const prismaError = error as { code: string; message: string };
            if (prismaError.code === 'P2002') {
                throw new CustomError('Ya existe un tanque con este nombre', 409);
            }
            if (prismaError.code === 'P2003') {
                throw new CustomError('Usuario asignado no válido', 400);
            }
        }

        logger.error('Error creando tanque:', error);
        throw new CustomError('Error interno del servidor al crear el tanque', 500);
    }
};

/**
 * @desc     Actualiza un tanque existente
 * @route    PUT /api/tanks/:id
 * @access   Private (Admin)
 */
export const updateTank = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, location, status, userId } = req.body;
        // @ts-ignore
        const currentUserId = req.user?.id;

        // Verificar que el tanque existe
        const existingTank = await prisma.tank.findUnique({
            where: { id }
        });

        if (!existingTank) {
            throw new CustomError('Tanque no encontrado', 404);
        }

        const updateData: any = {};
        if (name) updateData.name = name.trim();
        if (location) updateData.location = location.trim();
        if (status) updateData.status = status;
        if (userId) updateData.userId = userId;

        // Validar cambio de nombre
        if (name && name.trim() !== existingTank.name) {
            const duplicateTank = await prisma.tank.findFirst({
                where: {
                    name: name.trim(),
                    userId: userId || existingTank.userId,
                    id: { not: id }
                }
            });

            if (duplicateTank) {
                throw new CustomError('Ya existe un tanque con este nombre para este usuario', 409);
            }
        }

        // Validar cambio de usuario
        if (userId && userId !== existingTank.userId) {
            const userExists = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!userExists) {
                throw new CustomError('Usuario asignado no encontrado', 404);
            }
        }

        const tank = await prisma.tank.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                },
                _count: {
                    select: { sensors: true }
                }
            }
        });

        logger.info(`Tanque actualizado: ${tank.name} por usuario ${currentUserId}`);

        res.json({
            success: true,
            data: tank,
            message: 'Tanque actualizado exitosamente'
        });
    } catch (error: unknown) {
        if (error instanceof CustomError) {
            throw error;
        }

        if (error && typeof error === 'object' && 'code' in error) {
            const prismaError = error as { code: string };
            if (prismaError.code === 'P2002') {
                throw new CustomError('Ya existe un tanque con este nombre', 409);
            }
            if (prismaError.code === 'P2025') {
                throw new CustomError('Tanque no encontrado', 404);
            }
        }

        logger.error('Error actualizando tanque:', error);
        throw new CustomError('Error interno del servidor al actualizar el tanque', 500);
    }
};

/**
 * @desc     Elimina un tanque
 * @route    DELETE /api/tanks/:id
 * @access   Private (Admin)
 */
export const deleteTank = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const currentUserId = req.user?.id;

        const existingTank = await prisma.tank.findUnique({
            where: { id },
            include: {
                sensors: true,
                _count: { select: { sensors: true } }
            }
        });

        if (!existingTank) {
            throw new CustomError('Tanque no encontrado', 404);
        }

        if (existingTank._count.sensors > 0) {
            throw new CustomError('No se puede eliminar el tanque porque tiene sensores asociados. Elimine o reasigne los sensores primero.', 400);
        }

        await prisma.tank.delete({
            where: { id }
        });

        logger.info(`Tanque eliminado: ${existingTank.name} por usuario ${currentUserId}`);

        res.json({
            success: true,
            message: 'Tanque eliminado exitosamente'
        });
    } catch (error: unknown) {
        if (error instanceof CustomError) {
            throw error;
        }

        if (error && typeof error === 'object' && 'code' in error) {
            const prismaError = error as { code: string };
            if (prismaError.code === 'P2025') {
                throw new CustomError('Tanque no encontrado', 404);
            }
        }

        logger.error('Error eliminando tanque:', error);
        throw new CustomError('Error interno del servidor al eliminar el tanque', 500);
    }
};

/**
 * @desc     Obtiene tanques de un usuario específico
 * @route    GET /api/tanks/user/:userId
 * @access   Private (Admin)
 */
export const getTanksByUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const tanks = await prisma.tank.findMany({
            where: { userId },
            include: {
                sensors: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        status: true,
                        lastReading: true
                    }
                },
                _count: {
                    select: { sensors: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: tanks
        });
    } catch (error: unknown) {
        logger.error('Error obteniendo tanques por usuario:', error);
        throw new CustomError('Error al obtener los tanques del usuario', 500);
    }
};