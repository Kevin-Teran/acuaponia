/**
 * @file dataService.ts
 * @description Servicio para interactuar con los endpoints de simulación de datos del backend.
 */
 import api from '@/config/api';

 /**
  * @function getEmitterStatus
  * @description Obtiene el estado de todos los simuladores de sensores activos.
  */
 export const getEmitterStatus = async (): Promise<any[]> => {
     const response = await api.get('/data/emitter/status');
     return response.data;
 };
 
 /**
  * @function startEmitters
  * @description Envía una solicitud para iniciar la simulación de datos para una lista de sensores.
  * @param {string[]} sensorIds - Un array de IDs de los sensores a simular.
  */
 export const startEmitters = async (sensorIds: string[]): Promise<void> => {
     await api.post('/data/emitter/start', { sensorIds });
 };
 
 /**
  * @function stopEmitter
  * @description Envía una solicitud para detener la simulación de un sensor específico.
  * @param {string} sensorId - El ID del sensor cuya simulación se va a detener.
  */
 export const stopEmitter = async (sensorId: string): Promise<void> => {
     await api.post('/data/emitter/stop', { sensorId });
 };