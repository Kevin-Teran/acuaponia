/**
 * @file dataService.ts
 * @description Servicio para gestionar todas las operaciones relacionadas con los datos de los sensores.
 * @author kevin mariano
 * @version 2.0.0 - CORREGIDO
 * @since 1.0.0
 */

import api from '@/config/api';
import { SensorData, ManualEntryDto, HistoricalDataParams } from '@/types';

/**
 * Obtiene los datos más recientes de los sensores.
 * @param {string} [tankId] - ID opcional del tanque para filtrar los datos.
 * @returns {Promise<SensorData[]>} Una promesa que se resuelve con un array de los últimos datos de los sensores.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const getLatestData = async (tankId?: string): Promise<SensorData[]> => {
  try {
    const params = tankId ? { tankId } : {};
    const response = await api.get('/data/latest', { params });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching latest data:', error);
    throw error;
  }
};

/**
 * Obtiene datos históricos de los sensores basado en un rango de fechas y otros parámetros.
 * @param {HistoricalDataParams} params - Parámetros para la consulta de datos históricos.
 * @returns {Promise<SensorData[]>} Una promesa que se resuelve con un array de datos históricos.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const getHistoricalData = async (params: HistoricalDataParams): Promise<SensorData[]> => {
  try {
    const response = await api.get('/data/historical', { params });
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching historical data:', error);
    throw error;
  }
};

/**
 * Registra una nueva entrada de datos de forma manual.
 * @param {ManualEntryDto} data - Los datos de la entrada manual a registrar.
 * @returns {Promise<SensorData>} Una promesa que se resuelve con el dato registrado.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const addManualEntry = async (data: ManualEntryDto): Promise<SensorData> => {
  try {
    const response = await api.post('/data/manual', data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error adding manual entry:', error);
    throw error;
  }
};

/**
 * Inicia simuladores de datos para sensores específicos.
 * @param {string[]} sensorIds - Array de IDs de sensores.
 * @returns {Promise<{ message: string }>} Mensaje de confirmación del servidor.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const startEmitters = async (sensorIds: string[]): Promise<{ message: string }> => {
  try {
    console.log('🚀 Starting emitters for sensors:', sensorIds);
    const response = await api.post('/data/emitter/start', { sensorIds });
    console.log('✅ Emitters started:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error starting emitters:', error);
    throw error;
  }
};

/**
 * Detiene un simulador de datos específico.
 * @param {string} sensorId - ID del sensor a detener.
 * @returns {Promise<{ message: string }>} Mensaje de confirmación del servidor.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const stopEmitter = async (sensorId: string): Promise<{ message: string }> => {
  try {
    console.log('⏹️ Stopping emitter for sensor:', sensorId);
    const response = await api.post('/data/emitter/stop', { sensorId });
    console.log('✅ Emitter stopped:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error stopping emitter:', error);
    throw error;
  }
};

/**
 * Obtiene el estado actual de los simuladores de datos.
 * @returns {Promise<any[]>} El estado de los simuladores activos.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const getEmitterStatus = async (): Promise<any[]> => {
  try {
    const response = await api.get('/data/emitter/status');
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching emitter status:', error);
    throw error;
  }
};