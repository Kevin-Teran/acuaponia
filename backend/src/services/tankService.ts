import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * @desc Servicio para la lógica de negocio de tanques
 */
export class TankService {
    /**
     * @desc Obtiene todos los tanques con información relacionada
     */
    static async getAllTanks() {
        try {
            return await prisma.tank.findMany({
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
        } catch (error) {
            logger.error('Error en TankService.getAllTanks:', error);
            throw new CustomError('Error al obtener los tanques', 500);
        }
    }

    /**
     * @desc Obtiene un tanque por ID
     */
    static async getTankById(id: string) {
        try {
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

            return tank;
        } catch (error) {
            if (error instanceof CustomError) {
                throw error;
            }
            logger.error('Error en TankService.getTankById:', error);
            throw new CustomError('Error al obtener el tanque', 500);
        }
    }

    /**
     * @desc Crea un nuevo tanque
     */
    static async createTank(data: {
        name: string;
        location: string;
        userId?: string;
        status?: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
    }, currentUserId: string) {
        try {
            const assignedUserId = data.userId || currentUserId;

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
                    name: data.name.trim(),
                    userId: assignedUserId
                }
            });

            if (existingTank) {
                throw new CustomError('Ya existe un tanque con este nombre para este usuario', 409);
            }

            return await prisma.tank.create({
                data: {
                    name: data.name.trim(),
                    location: data.location.trim(),
                    status: data.status || 'ACTIVE',
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
        } catch (error) {
            if (error instanceof CustomError) {
                throw error;
            }
            logger.error('Error en TankService.createTank:', error);
            throw new CustomError('Error al crear el tanque', 500);
        }
    }

    /**
     * @desc Actualiza un tanque existente
     */
    static async updateTank(id: string, data: {
        name?: string;
        location?: string;
        status?: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
        userId?: string;
    }) {
        try {
            // Verificar que el tanque existe
            const existingTank = await prisma.tank.findUnique({
                where: { id }
            });

            if (!existingTank) {
                throw new CustomError('Tanque no encontrado', 404);
            }

            // Si se está cambiando el nombre, verificar duplicados
            if (data.name && data.name.trim() !== existingTank.name) {
                const duplicateTank = await prisma.tank.findFirst({
                    where: {
                        name: data.name.trim(),
                        userId: data.userId || existingTank.userId,
                        id: { not: id }
                    }
                });

                if (duplicateTank) {
                    throw new CustomError('Ya existe un tanque con este nombre para este usuario', 409);
                }
            }

            // Si se está cambiando el usuario, verificar que existe
            if (data.userId && data.userId !== existingTank.userId) {
                const userExists = await prisma.user.findUnique({
                    where: { id: data.userId }
                });

                if (!userExists) {
                    throw new CustomError('Usuario asignado no encontrado', 404);
                }
            }

            // Preparar datos de actualización
            const updateData: any = {};
            if (data.name) updateData.name = data.name.trim();
            if (data.location) updateData.location = data.location.trim();
            if (data.status) updateData.status = data.status;
            if (data.userId) updateData.userId = data.userId;

            return await prisma.tank.update({
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
        } catch (error) {
            if (error instanceof CustomError) {
                throw error;
            }
            logger.error('Error en TankService.updateTank:', error);
            throw new CustomError('Error al actualizar el tanque', 500);
        }
    }

    /**
     * @desc Elimina un tanque
     */
    static async deleteTank(id: string) {
        try {
            // Verificar que el tanque existe y obtener información de sensores
            const existingTank = await prisma.tank.findUnique({
                where: { id },
                include: {
                    _count: { select: { sensors: true } }
                }
            });

            if (!existingTank) {
                throw new CustomError('Tanque no encontrado', 404);
            }

            // Verificar que no tiene sensores asociados
            if (existingTank._count.sensors > 0) {
                throw new CustomError('No se puede eliminar el tanque porque tiene sensores asociados. Elimine o reasigne los sensores primero.', 400);
            }

            await prisma.tank.delete({
                where: { id }
            });

            return { success: true };
        } catch (error) {
            if (error instanceof CustomError) {
                throw error;
            }
            logger.error('Error en TankService.deleteTank:', error);
            throw new CustomError('Error al eliminar el tanque', 500);
        }
    }

    /**
     * @desc Obtiene tanques de un usuario específico
     */
    static async getTanksByUser(userId: string) {
        try {
            return await prisma.tank.findMany({
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
        } catch (error) {
            logger.error('Error en TankService.getTanksByUser:', error);
            throw new CustomError('Error al obtener los tanques del usuario', 500);
        }
    }

    /**
     * @desc Obtiene estadísticas de tanques
     */
    static async getTankStats() {
        try {
            const [total, active, maintenance, inactive] = await Promise.all([
                prisma.tank.count(),
                prisma.tank.count({ where: { status: 'ACTIVE' } }),
                prisma.tank.count({ where: { status: 'MAINTENANCE' } }),
                prisma.tank.count({ where: { status: 'INACTIVE' } })
            ]);

            return {
                total,
                active,
                maintenance,
                inactive
            };
        } catch (error) {
            logger.error('Error en TankService.getTankStats:', error);
            throw new CustomError('Error al obtener estadísticas de tanques', 500);
        }
    }
}