/**
 * @file sensorService.ts
 * @description Servicio para gestionar todas las operaciones CRUD para los sensores.
 */
 import api from '@/config/api';
 import { Sensor } from '@/types';
 
 /**
  * @function getSensors
  * @description Obtiene una lista de sensores, opcionalmente filtrada por ID de usuario para administradores.
  * @param {string} [userId] - El ID opcional del usuario.
  * @returns {Promise<Sensor[]>} Una promesa que resuelve a un array de sensores.
  */
 export const getSensors = async (userId?: string): Promise<Sensor[]> => {
     const response = await api.get('/sensors', { params: userId ? { userId } : {} });
     return response.data;
 };
 
 /**
  * @function getSensorById
  * @description Obtiene un sensor específico por su ID.
  * @param {string} id - El ID del sensor.
  * @returns {Promise<Sensor>} El sensor encontrado.
  */
 export const getSensorById = async (id: string): Promise<Sensor> => {
     const response = await api.get(`/sensors/${id}`);
     return response.data;
 };
 
 /**
  * @function createSensor
  * @description Crea un nuevo sensor en la base de datos.
  * @param {Partial<Sensor>} sensorData - Los datos del sensor a crear.
  * @returns {Promise<Sensor>} El sensor recién creado.
  */
 export const createSensor = async (sensorData: Partial<Sensor>): Promise<Sensor> => {
     const response = await api.post('/sensors', sensorData);
     return response.data;
 };
 
 /**
  * @function updateSensor
  * @description Actualiza un sensor existente por su ID.
  * @param {string} id - El ID del sensor a actualizar.
  * @param {Partial<Sensor>} sensorData - Los nuevos datos para el sensor.
  * @returns {Promise<Sensor>} El sensor actualizado.
  */
 export const updateSensor = async (id: string, sensorData: Partial<Sensor>): Promise<Sensor> => {
     const response = await api.put(`/sensors/${id}`, sensorData);
     return response.data;
 };
 
 /**
  * @function deleteSensor
  * @description Elimina un sensor por su ID.
  * @param {string} id - El ID del sensor a eliminar.
  * @returns {Promise<void>}
  */
 export const deleteSensor = async (id: string): Promise<void> => {
     await api.delete(`/sensors/${id}`);
 };
 