import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { Role } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: { id: string; role: Role; email: string; };
}

/**
 * @desc     Obtiene sensores con su última lectura y tendencia.
 * ADMIN ve todos, USER solo los de sus tanques.
 * @route    GET /api/sensors
 * @access   Private
 */
 export const getSensors = async (req: AuthenticatedRequest, res: Response) => {
    const { id: userId, role } = req.user;
    const whereClause = role === 'ADMIN' ? {} : { tank: { userId: userId } };

    const sensors = await prisma.sensor.findMany({
        where: whereClause,
        include: {
            tank: { select: { name: true } },
            // Obtener las 2 últimas lecturas para calcular la tendencia
            sensorData: {
                orderBy: { timestamp: 'desc' },
                take: 2,
            },
        },
        orderBy: { createdAt: 'desc' }
    });
    
    // Mapear los sensores para añadir la tendencia y limpiar datos innecesarios
    const sensorsWithTrend = sensors.map(sensor => {
        const { sensorData, ...rest } = sensor;
        let trend: 'up' | 'down' | 'neutral' = 'neutral';
        const lastReading = sensorData[0]?.value ?? null;
        const previousReading = sensorData[1]?.value ?? null;

        if (lastReading !== null && previousReading !== null) {
            if (lastReading > previousReading) trend = 'up';
            if (lastReading < previousReading) trend = 'down';
        }

        return {
            ...rest,
            lastReading,
            trend,
        };
    });

    res.json({ success: true, data: sensorsWithTrend });
};

/**
 * @desc     Crea un nuevo sensor, verificando que el tipo no exista ya en el tanque.
 * @route    POST /api/sensors
 * @access   Private
 */
 export const createSensor = async (req: AuthenticatedRequest, res: Response) => {
    const { name, hardwareId, type, tankId, calibrationDate } = req.body;
    const { id: userId, role } = req.user;

    const tank = await prisma.tank.findUnique({ where: { id: tankId } });
    if (!tank) throw new CustomError('El tanque especificado no existe', 404);
    if (role !== 'ADMIN' && tank.userId !== userId) throw new CustomError('No tiene permisos para este tanque', 403);

    // NUEVA VALIDACIÓN: Asegurar que el tipo de sensor sea único por tanque
    const existingSensorType = await prisma.sensor.findFirst({
        where: { tankId, type }
    });
    if (existingSensorType) {
        throw new CustomError(`El tanque ya tiene un sensor de tipo ${type}.`, 409); // 409 Conflict
    }

    const sensor = await prisma.sensor.create({
        data: { name, hardwareId, type, tankId, calibrationDate: new Date(calibrationDate), location: tank.location }
    });

    logger.info(`Sensor creado: ${sensor.name} por usuario ${userId}`);
    res.status(201).json({ success: true, data: sensor, message: 'Sensor creado exitosamente.' });
};

/**
 * @desc     Actualiza un sensor, verificando propiedad y unicidad de tipo si se mueve de tanque.
 * @route    PUT /api/sensors/:id
 * @access   Private
 */
 export const updateSensor = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = req.body;
    const { id: userId, role } = req.user;

    const sensor = await prisma.sensor.findUnique({ where: { id }, include: { tank: true } });
    if (!sensor) throw new CustomError('Sensor no encontrado', 404);
    if (role !== 'ADMIN' && sensor.tank.userId !== userId) throw new CustomError('No tiene permisos para modificar este sensor', 403);

    if (data.tankId && data.tankId !== sensor.tankId) {
        const destinationTank = await prisma.tank.findUnique({ where: { id: data.tankId } });
        if (!destinationTank) throw new CustomError('Tanque de destino no encontrado', 404);
        if (role !== 'ADMIN' && destinationTank.userId !== userId) throw new CustomError('No puede mover sensores a un tanque que no le pertenece', 403);

        const existingSensorType = await prisma.sensor.findFirst({
            where: { tankId: data.tankId, type: sensor.type }
        });
        if (existingSensorType) {
            throw new CustomError(`El tanque de destino ya tiene un sensor de tipo ${sensor.type}.`, 409);
        }
    }

    const updatedSensor = await prisma.sensor.update({ where: { id }, data });
    res.json({ success: true, data: updatedSensor, message: 'Sensor actualizado.' });
};

/**
 * @desc     Elimina un sensor, verificando la propiedad del tanque.
 * @route    DELETE /api/sensors/:id
 * @access   Private
 */
export const deleteSensor = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { id: userId, role } = req.user;

    const sensor = await prisma.sensor.findUnique({ where: { id }, include: { tank: true } });
    if (!sensor) {
        throw new CustomError('Sensor no encontrado', 404);
    }
    if (role !== 'ADMIN' && sensor.tank.userId !== userId) {
        throw new CustomError('No tiene permisos para eliminar este sensor', 403);
    }
    
    await prisma.sensor.delete({ where: { id } });
    res.json({ success: true, message: 'Sensor eliminado exitosamente.' });
};


export const getSensorById = async (req: AuthenticatedRequest, res: Response) => {
    const sensor = await prisma.sensor.findUnique({ where: { id: req.params.id } });
    res.json({ success: true, data: sensor });
};
export const getSensorsByTank = async (req: AuthenticatedRequest, res: Response) => {
    const sensors = await prisma.sensor.findMany({ where: { tankId: req.params.tankId } });
    res.json({ success: true, data: sensors });
};
export const getSensorByHardwareId = async (req: AuthenticatedRequest, res: Response) => {
    const sensor = await prisma.sensor.findUnique({ where: { hardwareId: req.params.hardwareId } });
    res.json({ success: true, data: sensor });
};