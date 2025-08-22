/**
 * @file dataService.ts
 * @description Servicio para gestionar todas las operaciones relacionadas con los datos de los sensores.
 * @author kevin mariano
 * @version 1.2.0
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
   const response = await api.get('/data/latest', { params: { tankId } });
   return response.data;
 };
 
 /**
  * Obtiene datos históricos de los sensores basado en un rango de fechas y otros parámetros.
  * @param {HistoricalDataParams} params - Parámetros para la consulta de datos históricos.
  * @returns {Promise<SensorData[]>} Una promesa que se resuelve con un array de datos históricos.
  * @throws {Error} Si ocurre un error durante la llamada a la API.
  */
 export const getHistoricalData = async (params: HistoricalDataParams): Promise<SensorData[]> => {
   const response = await api.get('/data/historical', { params });
   return response.data;
 };
 
 /**
  * Registra una nueva entrada de datos de forma manual.
  * @param {ManualEntryDto} data - Los datos de la entrada manual a registrar.
  * @returns {Promise<SensorData>} Una promesa que se resuelve con el dato registrado.
  * @throws {Error} Si ocurre un error durante la llamada a la API.
  */
 export const addManualEntry = async (data: ManualEntryDto): Promise<SensorData> => {
   const response = await api.post('/data/manual', data);
   return response.data;
 };
 
 /**
  * Inicia el emisor de datos simulados en el backend.
  * @returns {Promise<{ message: string }>} Mensaje de confirmación del servidor.
  * @throws {Error} Si ocurre un error durante la llamada a la API.
  */
 export const startDataEmitter = async (): Promise<{ message: string }> => {
     const response = await api.post('/data/emitter/start');
     return response.data;
 };
 
 /**
  * Detiene el emisor de datos simulados en el backend.
  * @returns {Promise<{ message: string }>} Mensaje de confirmación del servidor.
  * @throws {Error} Si ocurre un error durante la llamada a la API.
  */
 export const stopDataEmitter = async (): Promise<{ message: string }> => {
     const response = await api.post('/data/emitter/stop');
     return response.data;
 };
 
 /**
  * Obtiene el estado actual del emisor de datos simulados.
  * @returns {Promise<{ isActive: boolean }>} El estado del emisor.
  * @throws {Error} Si ocurre un error durante la llamada a la API.
  */
 export const getDataEmitterStatus = async (): Promise<{ isActive: boolean }> => {
     const response = await api.get('/data/emitter/status');
     return response.data;
 };