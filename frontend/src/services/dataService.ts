/**
 * @file dataService.ts
 * @description Servicio para gestionar todas las peticiones de datos de sensores.
 */

import { api } from '@/config/api'; // <-- CORRECCIÓN APLICADA: Importación nombrada
import { SensorData, SensorType } from '@/types';

/**
 * Obtiene los últimos datos registrados para un tanque, opcionalmente filtrando por tipo de sensor.
 *
 * @param {string} [tankId] - El ID del tanque.
 * @param {SensorType} [sensorType] - El tipo de sensor a filtrar (TEMPERATURE, PH, TDS).
 * @returns {Promise<SensorData[]>} Una promesa que resuelve a un arreglo con los últimos datos.
 * @throws Lanza un error si la petición a la API falla.
 */
export const getLatestData = async (tankId?: string, sensorType?: SensorType): Promise<SensorData[]> => {
  try {
    const params = new URLSearchParams();
    if (tankId) params.append('tankId', tankId);
    if (sensorType) params.append('type', sensorType);
    
    const response = await api.get(`/data/latest?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener los últimos datos de sensores:', error);
    throw error;
  }
};

/**
 * Obtiene el historial de datos para un sensor específico en un rango de fechas.
 *
 * @param {string} sensorId - El ID del sensor.
 * @param {string} from - Fecha de inicio en formato ISO string.
 * @param {string} to - Fecha de fin en formato ISO string.
 * @returns {Promise<SensorData[]>} Una promesa que resuelve a un arreglo con el historial de datos.
 * @throws Lanza un error si la petición a la API falla.
 */
export const getHistoricalData = async (sensorId: string, from: string, to: string): Promise<SensorData[]> => {
  try {
    const params = new URLSearchParams({ from, to });
    const response = await api.get(`/data/historical/${sensorId}?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener datos históricos para el sensor ${sensorId}:`, error);
    throw error;
  }
};

/**
 * Obtiene el estado actual de los emisores de datos (simulaciones).
 *
 * @returns {Promise<any[]>} Una promesa que resuelve con la lista de emisores activos.
 * @throws Lanza un error si la petición a la API falla.
 */
export const getEmitterStatus = async (): Promise<any[]> => {
  try {
    const response = await api.get('/data/emitters/status');
    return response.data;
  } catch (error) {
    console.error('Error al obtener el estado de los emisores:', error);
    throw error;
  }
};

/**
 * Inicia la simulación de datos para un conjunto de sensores.
 *
 * @param {string[]} sensorIds - Arreglo de IDs de sensores a iniciar.
 * @returns {Promise<void>}
 * @throws Lanza un error si la petición a la API falla.
 */
export const startEmitters = async (sensorIds: string[]): Promise<void> => {
    try {
        await api.post('/data/emitters/start', { sensorIds });
    } catch (error) {
        console.error('Error al iniciar los emisores:', error);
        throw error;
    }
};

/**
 * Detiene la simulación de datos para un sensor específico.
 *
 * @param {string} sensorId - El ID del sensor a detener.
 * @returns {Promise<void>}
 * @throws Lanza un error si la petición a la API falla.
 */
export const stopEmitter = async (sensorId: string): Promise<void> => {
    try {
        await api.post('/data/emitters/stop', { sensorId });
    } catch (error) {
        console.error(`Error al detener el emisor para el sensor ${sensorId}:`, error);
        throw error;
    }
};

/**
 * Función genérica para obtener datos de sensores.
 * AÑADIDA PARA SOLUCIONAR EL ERROR DE IMPORTACIÓN EN 'useSensorData.ts'.
 *
 * @param {object} params - Objeto de parámetros para la consulta.
 * @returns {Promise<SensorData[]>} Una promesa que resuelve a un arreglo de datos de sensor.
 */
export const getSensorData = async (params: { [key: string]: any }): Promise<SensorData[]> => {
  try {
    const queryParams = new URLSearchParams(params).toString();
    const response = await api.get(`/data?${queryParams}`);
    return response.data;
  } catch (error) {
    console.error('Error al obtener datos genéricos de sensor:', error);
    throw error;
  }
};