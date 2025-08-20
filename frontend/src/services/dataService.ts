/**
 * @file dataService.ts
 * @description Servicio unificado para todas las operaciones relacionadas con los datos de los sensores.
 * Incluye obtención de datos históricos, datos más recientes, entradas manuales y control de simuladores.
 * @author Kevin Mariano
 */
 import api from '@/config/api';
 import { SensorData } from '@/types';
  
 /**
  * Obtiene los datos más recientes de los sensores para un estanque específico.
  * Esencial para la carga inicial del dashboard.
  * @param {string} tankId - El ID del estanque.
  * @returns {Promise<SensorData[]>} Una promesa que se resuelve con los últimos datos de los sensores.
  * @throws Lanza un error si la petición a la API falla.
  */
 export const getSensorData = async (tankId: string): Promise<SensorData[]> => {
   try {
     // Asumimos un endpoint como /data/latest/:tankId o similar. Ajusta si es necesario.
     const response = await api.get<{ data: SensorData[] }>(`/data/latest/${tankId}`);
     return response.data.data;
   } catch (error) {
     console.error(`Error al obtener los datos del estanque ${tankId}:`, error);
     throw new Error('No se pudieron obtener los datos de los sensores.');
   }
 };
 
 /**
  * Obtiene los datos históricos de un estanque en un rango de fechas.
  * @param {string} tankId - El ID del estanque.
  * @param {string} startDate - La fecha de inicio en formato YYYY-MM-DD.
  * @param {string} endDate - La fecha de fin en formato YYYY-MM-DD.
  * @returns {Promise<SensorData[]>} Una promesa que se resuelve con los datos históricos.
  * @throws Lanza un error si la petición a la API falla.
  */
 export const getHistoricalData = async (tankId: string, startDate: string, endDate: string): Promise<SensorData[]> => {
     try {
         const params = new URLSearchParams({ tankId, startDate, endDate });
         const response = await api.get<{ data: SensorData[] }>(`/data/historical?${params.toString()}`);
         return response.data.data;
     } catch (error) {
         console.error('Error al obtener datos históricos:', error);
         throw new Error('No se pudieron obtener los datos históricos.');
     }
 };
 
 /**
  * Crea una entrada manual de datos para un sensor.
  * @param {object} data - Los datos para la entrada manual.
  * @param {string} data.sensorId - El ID del sensor.
  * @param {number} data.value - El valor a registrar.
  * @returns {Promise<SensorData>} La entrada de datos creada.
  * @throws Lanza un error si la petición a la API falla.
  */
 export const createManualEntry = async (data: { sensorId: string; value: number }): Promise<SensorData> => {
     try {
         const response = await api.post('/data/manual', data);
         return response.data;
     } catch (error) {
         console.error('Error al crear entrada manual:', error);
         throw new Error('No se pudo registrar la entrada manual.');
     }
 };
 
 
 // --- Funciones de Control del Simulador (Emitter) ---
 
 /**
  * @function getEmitterStatus
  * @description Obtiene el estado de todos los simuladores de sensores activos.
  * @returns {Promise<any[]>} El estado de los emisores.
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
 