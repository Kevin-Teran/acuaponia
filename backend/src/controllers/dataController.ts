import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { mqttService } from '../services/mqttService';
import { syntheticDataService } from '../services/syntheticDataService';

/**
 * @desc     Publica una entrada de datos manual a través de MQTT.
 * @route    POST /api/data/manual-entry
 * @access   Private (Admin)
 */
export const manualDataEntry = async (req: Request, res: Response) => {
    const { sensorId, temperature, ph, oxygen } = req.body;

    if (!sensorId) throw new CustomError('El ID del sensor es requerido.', 400);

    const topic = `sena/acuaponia/sensors/${sensorId}/data`;
    const payload = JSON.stringify({
        temperature: parseFloat(temperature),
        ph: parseFloat(ph),
        oxygen: parseFloat(oxygen),
        timestamp: new Date().toISOString()
    });

    mqttService.publish(topic, payload);
    logger.info(`Entrada manual enviada para el sensor ${sensorId}`);
    res.status(200).json({ success: true, message: 'Datos enviados al broker MQTT.' });
};

/**
 * @desc     Inicia emisores de datos sintéticos para una lista de sensores.
 * @route    POST /api/data/synthetic/start
 * @access   Private (Admin)
 */
 export const startSyntheticEmitter = async (req: Request, res: Response) => {
    // CORRECCIÓN CLAVE: El frontend envía un array de strings.
    const sensorIds = req.body as string[];

    if (!sensorIds || !Array.isArray(sensorIds) || sensorIds.length === 0) {
        throw new CustomError('Se requiere un array de IDs de sensores.', 400);
    }

    await Promise.all(sensorIds.map(sensorId => syntheticDataService.startEmitter(sensorId)));
    
    res.status(200).json({ success: true, message: 'Procesos de emisión iniciados.' });
};

/**
 * @desc     Detiene un emisor de datos sintéticos.
 * @route    POST /api/data/synthetic/stop
 * @access   Private (Admin)
 */
 export const stopSyntheticEmitter = (req: Request, res: Response) => {
    const { sensorId } = req.body;
    syntheticDataService.stopEmitter(sensorId);
    res.status(200).json({ success: true, message: 'Emisor detenido y eliminado.' });
};

/**
 * @desc     Obtiene el estado de todos los emisores activos.
 * @route    GET /api/data/synthetic/status
 * @access   Private (Admin)
 */
 export const getSyntheticEmitterStatus = (req: Request, res: Response) => {
    const activeEmitters = syntheticDataService.getActiveEmitters();
    res.status(200).json({ success: true, data: activeEmitters });
};


export const pauseSyntheticEmitter = (req: Request, res: Response) => {
    const { sensorId } = req.body;
    syntheticDataService.pauseEmitter(sensorId);
    res.status(200).json({ success: true, message: 'Emisor pausado.' });
};

export const resumeSyntheticEmitter = (req: Request, res: Response) => {
    const { sensorId } = req.body;
    syntheticDataService.resumeEmitter(sensorId);
    res.status(200).json({ success: true, message: 'Emisor reanudado.' });
};