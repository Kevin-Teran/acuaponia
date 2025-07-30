import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * @desc     Obtiene todos los sensores con información del tanque
 * @route    GET /api/sensors
 * @access   Private (Admin)
 */
export const getSensors = async (req: Request, res: Response) => {
    try {
        const sensors = await prisma.sensor.findMany({
            include: {
                tank: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        status: true,
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                },
                _count: {
                    select: { sensorData: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: sensors
        });
    } catch (error: unknown) {
        logger.error('Error obteniendo sensores:', error);
        throw new CustomError('Error al obtener los sensores', 500);
    }
};

/**
 * @desc     Obtiene un sensor por ID con todos sus detalles
 * @route    GET /api/sensors/:id
 * @access   Private (Admin)
 */
export const getSensorById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const sensor = await prisma.sensor.findUnique({
            where: { id },
            include: {
                tank: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                },
                sensorData: {
                    take: 10,
                    orderBy: { timestamp: 'desc' }
                },
                _count: {
                    select: { sensorData: true }
                }
            }
        });

        if (!sensor) {
            throw new CustomError('Sensor no encontrado', 404);
        }

        res.json({
            success: true,
            data: sensor
        });
    } catch (error: unknown) {
        if (error instanceof CustomError) {
            throw error;
        }
        logger.error('Error obteniendo sensor por ID:', error);
        throw new CustomError('Error al obtener el sensor', 500);
    }
};

/**
 * @desc     Crea un nuevo sensor
 * @route    POST /api/sensors
 * @access   Private (Admin)
 */
export const createSensor = async (req: Request, res: Response) => {
    try {
        const { name, hardwareId, type, tankId, calibrationDate, status = 'ACTIVE' } = req.body;
        // @ts-ignore
        const currentUserId = req.user?.id;

        if (!name || !hardwareId || !type || !tankId || !calibrationDate) {
            throw new CustomError('Todos los campos son requeridos', 400);
        }

        const tankExists = await prisma.tank.findUnique({
            where: { id: tankId }
        });

        if (!tankExists) {
            throw new CustomError('Tanque no encontrado', 404);
        }

        const existingHardwareId = await prisma.sensor.findUnique({
            where: { hardwareId: hardwareId.trim() }
        });

        if (existingHardwareId) {
            throw new CustomError('Ya existe un sensor con este ID de hardware', 409);
        }

        const existingTypeInTank = await prisma.sensor.findFirst({
            where: {
                tankId,
                type
            }
        });

        if (existingTypeInTank) {
            throw new CustomError(`Ya existe un sensor de tipo ${type} en este tanque`, 409);
        }

        const sensor = await prisma.sensor.create({
            data: {
                name: name.trim(),
                hardwareId: hardwareId.trim(),
                location: tankExists.location,
                type,
                tankId,
                calibrationDate: new Date(calibrationDate),
                status
            },
            include: {
                tank: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        logger.info(`Sensor creado: ${sensor.name} (${sensor.hardwareId}) por usuario ${currentUserId}`);

        res.status(201).json({
            success: true,
            data: sensor,
            message: 'Sensor creado exitosamente'
        });
    } catch (error: unknown) {
        if (error instanceof CustomError) {
            throw error;
        }

        if (error && typeof error === 'object' && 'code' in error) {
            const prismaError = error as { code: string; message: string };
            if (prismaError.code === 'P2002') {
                if (prismaError.message.includes('hardwareId')) {
                    throw new CustomError('Ya existe un sensor con este ID de hardware', 409);
                }
                throw new CustomError('Ya existe un sensor con estos datos', 409);
            }
            if (prismaError.code === 'P2003') {
                throw new CustomError('Tanque asignado no válido', 400);
            }
        }

        logger.error('Error creando sensor:', error);
        throw new CustomError('Error interno del servidor al crear el sensor', 500);
    }
};

/**
 * @desc     Actualiza un sensor existente
 * @route    PUT /api/sensors/:id
 * @access   Private (Admin)
 */
export const updateSensor = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, hardwareId, status, calibrationDate, tankId } = req.body;
        // @ts-ignore
        const currentUserId = req.user?.id;

        const existingSensor = await prisma.sensor.findUnique({
            where: { id }
        });

        if (!existingSensor) {
            throw new CustomError('Sensor no encontrado', 404);
        }

        const updateData: any = {};
        if (name) updateData.name = name.trim();
        if (hardwareId) updateData.hardwareId = hardwareId.trim();
        if (status) updateData.status = status;
        if (calibrationDate) updateData.calibrationDate = new Date(calibrationDate);
        if (tankId) updateData.tankId = tankId;

        // Si se está cambiando el hardwareId, verificar duplicados
        if (hardwareId && hardwareId.trim() !== existingSensor.hardwareId) {
            const duplicateHardwareId = await prisma.sensor.findUnique({
                where: { hardwareId: hardwareId.trim() }
            });

            if (duplicateHardwareId) {
                throw new CustomError('Ya existe un sensor con este ID de hardware', 409);
            }
        }

        if (tankId && tankId !== existingSensor.tankId) {
            const tankExists = await prisma.tank.findUnique({
                where: { id: tankId }
            });

            if (!tankExists) {
                throw new CustomError('Tanque de destino no encontrado', 404);
            }

            const conflictingSensor = await prisma.sensor.findFirst({
                where: {
                    tankId,
                    type: existingSensor.type,
                    id: { not: id }
                }
            });

            if (conflictingSensor) {
                throw new CustomError(`Ya existe un sensor de tipo ${existingSensor.type} en el tanque de destino`, 409);
            }
        }

        const sensor = await prisma.sensor.update({
            where: { id },
            data: updateData,
            include: {
                tank: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        logger.info(`Sensor actualizado: ${sensor.name} (${sensor.hardwareId}) por usuario ${currentUserId}`);

        res.json({
            success: true,
            data: sensor,
            message: 'Sensor actualizado exitosamente'
        });
    } catch (error: unknown) {
        if (error instanceof CustomError) {
            throw error;
        }

        if (error && typeof error === 'object' && 'code' in error) {
            const prismaError = error as { code: string };
            if (prismaError.code === 'P2002') {
                throw new CustomError('Ya existe un sensor con este ID de hardware', 409);
            }
            if (prismaError.code === 'P2025') {
                throw new CustomError('Sensor no encontrado', 404);
            }
        }

        logger.error('Error actualizando sensor:', error);
        throw new CustomError('Error interno del servidor al actualizar el sensor', 500);
    }
};

/**
 * @desc     Elimina un sensor
 * @route    DELETE /api/sensors/:id
 * @access   Private (Admin)
 */
export const deleteSensor = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const currentUserId = req.user?.id;

        const existingSensor = await prisma.sensor.findUnique({
            where: { id },
            include: {
                _count: { select: { sensorData: true } }
            }
        });

        if (!existingSensor) {
            throw new CustomError('Sensor no encontrado', 404);
        }

        await prisma.$transaction([
            prisma.sensorData.deleteMany({
                where: { sensorId: id }
            }),
            prisma.sensor.delete({
                where: { id }
            })
        ]);

        logger.info(`Sensor eliminado: ${existingSensor.name} (${existingSensor.hardwareId}) con ${existingSensor._count.sensorData} registros de datos por usuario ${currentUserId}`);

        res.json({
            success: true,
            message: 'Sensor eliminado exitosamente'
        });
    } catch (error: unknown) {
        if (error instanceof CustomError) {
            throw error;
        }

        if (error && typeof error === 'object' && 'code' in error) {
            const prismaError = error as { code: string };
            if (prismaError.code === 'P2025') {
                throw new CustomError('Sensor no encontrado', 404);
            }
        }

        logger.error('Error eliminando sensor:', error);
        throw new CustomError('Error interno del servidor al eliminar el sensor', 500);
    }
};

/**
 * @desc     Obtiene sensores de un tanque específico
 * @route    GET /api/sensors/tank/:tankId
 * @access   Private (Admin)
 */
export const getSensorsByTank = async (req: Request, res: Response) => {
    try {
        const { tankId } = req.params;

        const tankExists = await prisma.tank.findUnique({
            where: { id: tankId }
        });

        if (!tankExists) {
            throw new CustomError('Tanque no encontrado', 404);
        }

        const sensors = await prisma.sensor.findMany({
            where: { tankId },
            include: {
                _count: {
                    select: { sensorData: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({
            success: true,
            data: sensors
        });
    } catch (error: unknown) {
        if (error instanceof CustomError) {
            throw error;
        }
        logger.error('Error obteniendo sensores por tanque:', error);
        throw new CustomError('Error al obtener los sensores del tanque', 500);
    }
};

/**
 * @desc     Obtiene sensores por hardwareId (para MQTT)
 * @route    GET /api/sensors/hardware/:hardwareId
 * @access   Private (Admin)
 */
export const getSensorByHardwareId = async (req: Request, res: Response) => {
    try {
        const { hardwareId } = req.params;

        const sensor = await prisma.sensor.findUnique({
            where: { hardwareId },
            include: {
                tank: {
                    select: {
                        id: true,
                        name: true,
                        location: true,
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        if (!sensor) {
            throw new CustomError('Sensor no encontrado', 404);
        }

        res.json({
            success: true,
            data: sensor
        });
    } catch (error: unknown) {
        if (error instanceof CustomError) {
            throw error;
        }
        logger.error('Error obteniendo sensor por hardwareId:', error);
        throw new CustomError('Error al obtener el sensor', 500);
    }
};