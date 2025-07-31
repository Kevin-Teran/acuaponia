import { Response } from 'express';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { startSyntheticEmitter, stopSyntheticEmitter, getActiveEmitters, manualDataEntry } from '../services/syntheticDataService';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../types';

/**
 * @desc     Inicia emisores de datos sintéticos para uno o más sensores.
 * @route    POST /api/data/synthetic/start
 * @access   Private (Admin)
 */
export const startEmitterController = async (req: AuthenticatedRequest, res: Response) => {
    // CORRECCIÓN: Se espera un objeto { sensorIds: [...] }
    const { sensorIds } = req.body;
    if (!Array.isArray(sensorIds) || sensorIds.length === 0) {
        throw new CustomError('Se requiere un array de IDs de sensores en la propiedad "sensorIds".', 400);
    }

    const sensors = await prisma.sensor.findMany({
        where: { id: { in: sensorIds } },
        include: { tank: { include: { user: true } } }
    });

    if (sensors.length !== sensorIds.length) {
        throw new CustomError('Uno o más IDs de sensores no fueron encontrados.', 404);
    }

    sensors.forEach(startSyntheticEmitter);
    logger.info(`Iniciando simulación para ${sensors.length} sensores por el admin ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Emisores sintéticos iniciados.' });
};

/**
 * @desc     Detiene un emisor de datos sintéticos.
 * @route    POST /api/data/synthetic/stop
 * @access   Private (Admin)
 */
export const stopEmitterController = async (req: AuthenticatedRequest, res: Response) => {
    const { sensorId } = req.body;
    if (!sensorId) throw new CustomError('Se requiere el ID del sensor.', 400);

    stopSyntheticEmitter(sensorId);
    logger.info(`Simulación detenida para sensor ${sensorId} por admin ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Emisor detenido.' });
};

/**
 * @desc     Obtiene la lista de todos los emisores activos.
 * @route    GET /api/data/synthetic/status
 * @access   Private (Admin)
 */
export const getEmittersStatusController = (req: AuthenticatedRequest, res: Response) => {
    const emitters = getActiveEmitters();
    res.status(200).json({ success: true, data: emitters });
};

/**
 * @desc     Recibe y publica una o varias entradas de datos manuales a través de MQTT.
 * @route    POST /api/data/manual-entry
 * @access   Private (Admin)
 */
export const manualEntryController = async (req: AuthenticatedRequest, res: Response) => {
    const { entries } = req.body; // Se espera un array de { sensorId, value }
    if (!Array.isArray(entries) || entries.length === 0) {
        throw new CustomError('Se requiere un array de "entries" con sensorId y value.', 400);
    }
    
    try {
        await Promise.all(entries.map(entry => manualDataEntry(entry.sensorId, entry.value)));
        logger.info(`Datos manuales enviados para ${entries.length} sensores por admin ${req.user.email}`);
        res.status(200).json({ success: true, message: 'Datos manuales enviados a MQTT.' });
    } catch (error: any) {
        throw new CustomError(error.message, 404);
    }
};