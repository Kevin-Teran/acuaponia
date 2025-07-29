import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { SensorType, SensorStatus } from '@prisma/client';

/**
 * @desc     Obtiene todos los sensores pertenecientes a los tanques del usuario.
 * @route    GET /api/sensors
 * @access   Private
 */
export const getSensors = async (req: Request, res: Response) => {
    // @ts-ignore
    const userId = req.user.id;

    const sensors = await prisma.sensor.findMany({
        where: {
            tank: { userId: userId },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: sensors });
};

/**
 * @desc     Crea un nuevo sensor.
 * @route    POST /api/sensors
 * @access   Private
 */
export const createSensor = async (req: Request, res: Response) => {
    const { name, type, tankId, calibrationDate } = req.body;

    if (!name || !type || !tankId || !calibrationDate) {
        throw new CustomError('Nombre, tipo, tanque y fecha de calibración son requeridos', 400);
    }
    
    // @ts-ignore - Se obtiene el location del tanque para mantener consistencia
    const tank = await prisma.tank.findUnique({ where: { id: tankId } });
    if (!tank) throw new CustomError('El tanque especificado no existe', 404);

    const newSensor = await prisma.sensor.create({
        data: {
            name,
            type: type as SensorType,
            tankId,
            calibrationDate: new Date(calibrationDate),
            location: tank.location, // Hereda la ubicación del tanque
            status: 'ACTIVE' as SensorStatus,
        },
    });

    logger.info(`Sensor creado: ${newSensor.name} para el tanque ${tankId}`);
    res.status(201).json({ success: true, data: newSensor });
};

/**
 * @desc     Actualiza un sensor existente.
 * @route    PUT /api/sensors/:id
 * @access   Private
 */
export const updateSensor = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, type, tankId, calibrationDate, status } = req.body;

    const updatedSensor = await prisma.sensor.update({
        where: { id },
        data: {
            name,
            type: type as SensorType,
            tankId,
            status: status as SensorStatus,
            calibrationDate: calibrationDate ? new Date(calibrationDate) : undefined,
        },
    });

    logger.info(`Sensor actualizado: ${updatedSensor.name}`);
    res.json({ success: true, data: updatedSensor });
};

/**
 * @desc     Elimina un sensor.
 * @route    DELETE /api/sensors/:id
 * @access   Private
 */
export const deleteSensor = async (req: Request, res: Response) => {
    const { id } = req.params;
    await prisma.sensor.delete({ where: { id } });
    logger.info(`Sensor eliminado: ${id}`);
    res.json({ success: true, message: 'Sensor eliminado correctamente' });
};