import api from '../config/api';

/**
 * @desc Envía una o más entradas de datos manuales.
 * @param entries - Un array de objetos, cada uno con `sensorId` y `value`.
 */
 export const submitManualEntry = (entries: { sensorId: string, value: number }[]) => {
    return api.post('/data/manual-entry', { entries });
};

/**
 * @desc Obtiene el estado de los emisores de datos sintéticos.
 * @returns {Promise<any[]>} Una promesa que resuelve a un array de emisores activos.
 */
 export const getEmitterStatus = async (): Promise<any[]> => {
    const response = await api.get('/data/synthetic/status');
    return response.data.data;
};

/**
 * @desc Inicia la simulación para un conjunto de sensores.
 * @param sensorIds - Un array de IDs de sensores.
 */
 export const startEmitter = (sensorIds: string[]) => {
    return api.post('/data/synthetic/start', { sensorIds });
};

/**
 * @desc Detiene la simulación para un sensor específico.
 * @param sensorId - El ID del sensor a detener.
 */
 export const stopEmitter = (sensorId: string) => {
    return api.post('/data/synthetic/stop', { sensorId });
};