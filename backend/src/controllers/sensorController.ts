import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { SensorType, SensorStatus } from '@prisma/client';

/**
 * @desc     Obtiene todos los sensores que pertenecen a los tanques del usuario autenticado.
 * @route    GET /api/sensors
 * @access   Private
 * @returns  {Promise<void>} Una respuesta JSON con la lista de sensores.
 */
export const getSensors = async (req: Request, res: Response): Promise<void> => {
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
 * @desc     Crea un nuevo sensor. Verifica que el tanque pertenezca al usuario.
 * @route    POST /api/sensors
 * @access   Private
 * @returns  {Promise<void>} Una respuesta JSON con el nuevo sensor creado.
 */
export const createSensor = async (req: Request, res: Response): Promise<void> => {
    const { name, type, tankId, calibrationDate, status } = req.body;
    // @ts-ignore
    const userId = req.user.id;

    const tank = await prisma.tank.findFirst({
        where: { id: tankId, userId }
    });
    if (!tank) throw new CustomError('El tanque especificado no existe o no le pertenece.', 404);

    const newSensor = await prisma.sensor.create({
        data: {
            name,
            type: type as SensorType,
            tankId,
            calibrationDate: new Date(calibrationDate),
            location: tank.location, // Hereda la ubicación del tanque
            status: (status as SensorStatus) || 'ACTIVE',
        },
    });

    logger.info(`Sensor creado: ${newSensor.name} para el tanque ${tankId}`);
    res.status(201).json({ success: true, data: newSensor });
};

/**
 * @desc     Actualiza un sensor existente. Verifica que el sensor pertenezca al usuario.
 * @route    PUT /api/sensors/:id
 * @access   Private
 * @returns  {Promise<void>} Una respuesta JSON con el sensor actualizado.
 */
export const updateSensor = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, type, tankId, calibrationDate, status } = req.body;
    // @ts-ignore
    const userId = req.user.id;

    const sensor = await prisma.sensor.findFirst({
        where: { id, tank: { userId } },
    });
    if (!sensor) throw new CustomError('Sensor no encontrado o no tiene permiso para editarlo.', 404);
    
    if (tankId && tankId !== sensor.tankId) {
        const newTank = await prisma.tank.findFirst({ where: { id: tankId, userId } });
        if (!newTank) throw new CustomError('El nuevo tanque no existe o no le pertenece.', 404);
    }

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
 * @desc     Elimina un sensor. Verifica que el sensor pertenezca al usuario.
 * @route    DELETE /api/sensors/:id
 * @access   Private
 * @returns  {Promise<void>} Una respuesta JSON confirmando la eliminación.
 */
export const deleteSensor = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    // @ts-ignore
    const userId = req.user.id;

    const sensor = await prisma.sensor.findFirst({
        where: { id, tank: { userId } },
    });
    if (!sensor) throw new CustomError('Sensor no encontrado o no tiene permiso para eliminarlo.', 404);

    await prisma.sensor.delete({ where: { id } });
    logger.info(`Sensor eliminado: ${id}`);
    res.json({ success: true, message: 'Sensor eliminado correctamente' });
};

/**
 * @desc     Obtiene los sensores de un tanque específico (para vistas de administrador).
 * @route    GET /api/sensors/tank/:tankId
 * @access   Private (Admin)
 * @returns  {Promise<void>} Una respuesta JSON con la lista de sensores del tanque.
 */
export const getSensorsByTankId = async (req: Request, res: Response): Promise<void> => {
    const { tankId } = req.params;
    const sensors = await prisma.sensor.findMany({
        where: { tankId },
        orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: sensors });
};