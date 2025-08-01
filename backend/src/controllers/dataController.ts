import { Request, Response } from 'express';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { startSyntheticEmitter, stopSyntheticEmitter, getActiveEmitters, manualDataEntry } from '../services/syntheticDataService';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types'; // Asumiendo que tienes un archivo de tipos con esta interfaz

/**
 * @desc     Inicia emisores de datos sintéticos para uno o más sensores.
 * @route    POST /api/data/synthetic/start
 * @access   Private (Admin)
 */
export const startEmitterController = async (req: AuthenticatedRequest, res: Response) => {
    const { sensorIds } = req.body;
    if (!Array.isArray(sensorIds) || sensorIds.length === 0) {
        throw new CustomError('Se requiere un array de IDs de sensores.', 400);
    }

    try {
        const sensors = await prisma.sensor.findMany({
            where: { id: { in: sensorIds } },
            include: { tank: { include: { user: true } } }
        });

        if (sensors.length !== sensorIds.length) {
            throw new CustomError('Uno o más sensores no fueron encontrados.', 404);
        }

        sensors.forEach(startSyntheticEmitter);
        logger.info(`Iniciando simulación para ${sensors.length} sensores por el admin ${req.user.email}`);
        res.status(200).json({ success: true, message: 'Emisores sintéticos iniciados.' });
    } catch (error) {
        logger.error('Error al iniciar emisores sintéticos:', error);
        throw new CustomError('No se pudieron iniciar los emisores.', 500);
    }
};

/**
 * @desc     Detiene un emisor de datos sintéticos.
 * @route    POST /api/data/synthetic/stop
 * @access   Private (Admin)
 */
export const stopEmitterController = async (req: Request, res: Response) => {
    const { sensorId } = req.body;
    if (!sensorId) throw new CustomError('Se requiere el ID del sensor.', 400);

    stopSyntheticEmitter(sensorId);
    res.status(200).json({ success: true, message: 'Emisor detenido.' });
};

/**
 * @desc     Obtiene la lista de todos los emisores activos.
 * @route    GET /api/data/synthetic/status
 * @access   Private (Admin)
 */
export const getEmittersStatusController = (req: Request, res: Response) => {
    const emitters = getActiveEmitters();
    res.status(200).json({ success: true, data: emitters });
};

/**
 * @desc     Recibe y publica una entrada de datos manual a través de MQTT.
 * @route    POST /api/data/manual
 * @access   Private (Admin)
 */
export const manualEntryController = async (req: Request, res: Response) => {
    const { sensorId, value } = req.body;
    if (!sensorId || value === undefined) {
        throw new CustomError('Se requieren sensorId y value.', 400);
    }
    
    try {
        await manualDataEntry(sensorId, value);
        res.status(200).json({ success: true, message: 'Dato manual enviado a MQTT.' });
    } catch (error: any) {
        throw new CustomError(error.message, 404);
    }
};

/**
 * @desc     Obtiene los últimos N registros de datos de sensores para el usuario autenticado.
 * @route    GET /api/data/historical
 * @access   Private
 */
 export const getHistoricalData = async (req: AuthenticatedRequest, res: Response) => {
    const { limit = 300 } = req.query; // Permite que el frontend defina el límite

    // Busca los tanques que pertenecen al usuario que hace la petición
    const userTanks = await prisma.tank.findMany({
        where: { userId: req.user.id },
        select: { id: true }
    });
    const tankIds = userTanks.map(tank => tank.id);

    // Busca los datos de sensores que pertenecen a esos tanques
    const data = await prisma.sensorData.findMany({
        where: {
            tankId: {
                in: tankIds,
            },
        },
        take: Number(limit),
        orderBy: {
            timestamp: 'desc',
        },
    });

    // Se revierte el array para que los gráficos los muestren en orden cronológico (del más antiguo al más nuevo)
    res.status(200).json({ success: true, data: data.reverse() });
};

/**
 * @desc     Obtiene la última lectura de cada tipo de sensor para un tanque.
 * @route    GET /api/data/latest
 * @access   Private
 */
 export const getLatestData = async (req: AuthenticatedRequest, res: Response) => {
    const { tankId } = req.query;

    if (!tankId) {
        throw new CustomError('El ID del tanque es requerido', 400);
    }
    
    const sensorTypes = ['TEMPERATURE', 'PH', 'OXYGEN'];
    const summary: any = {};

    for (const type of sensorTypes) {
        const data = await prisma.sensorData.findMany({
            where: { tankId: String(tankId), type: type as any },
            orderBy: { timestamp: 'desc' },
            take: 2 // Tomamos los dos últimos para tener el actual y el previo
        });

        summary[type.toLowerCase()] = {
            current: data[0]?.value ?? 0,
            previous: data[1]?.value, // Puede ser undefined si no hay segundo valor
        };
    }

    res.status(200).json({ success: true, data: summary });
};