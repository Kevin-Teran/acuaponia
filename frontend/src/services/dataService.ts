// frontend/src/services/dataService.ts
import api from '../config/api';

/**
 * @fileoverview Servicio para interactuar con los endpoints de /api/data del backend.
 * Proporciona funciones para el envío de datos manuales y el control de simuladores.
 */

/**
 * @async
 * @function submitManualEntry
 * @description Envía un conjunto de lecturas manuales de sensores al backend.
 * @param {Array<{ sensorId: string; value: number }>} entries - Un array de lecturas de sensor.
 * @returns {Promise<any>} La respuesta de la API.
 */
export const submitManualEntry = (entries: { sensorId: string; value: number }[]) => {
  return api.post('/data/manual', { entries });
};

/**
 * @async
 * @function startEmitter
 * @description Solicita al backend que inicie la simulación de datos para una lista de sensores.
 * @param {string[]} sensorIds - Un array con los IDs de los sensores a simular.
 * @returns {Promise<any>} La respuesta de la API.
 */
export const startEmitter = (sensorIds: string[]) => {
  return api.post('/data/emitter/start', { sensorIds });
};

/**
 * @async
 * @function stopEmitter
 * @description Solicita al backend que detenga la simulación de datos para un sensor específico.
 * @param {string} sensorId - El ID del sensor a detener.
 * @returns {Promise<any>} La respuesta de la API.
 */
export const stopEmitter = (sensorId: string) => {
  return api.post('/data/emitter/stop', { sensorId });
};

/**
 * @async
 * @function getEmitterStatus
 * @description Obtiene la lista de todas las simulaciones de sensores que están activas en el backend.
 * @returns {Promise<any>} Una promesa que resuelve con los datos de los emisores activos.
 */
export const getEmitterStatus = async () => {
  const response = await api.get('/data/emitter/status');
  return response.data;
};