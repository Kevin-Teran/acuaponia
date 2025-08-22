/**
 * @file sensorService.ts
 * @description Servicio para gestionar las operaciones CRUD de los sensores.
 * @author kevin mariano
 * @version 2.0.0
 * @since 1.0.0
 */

import api from '@/config/api';
import { Sensor, CreateSensorDto, UpdateSensorDto } from '@/types';

/**
 * Obtiene todos los sensores. Puede filtrar por tanque si se proporciona un tankId.
 * @param {string} [tankId] - ID opcional del tanque para filtrar los sensores.
 * @returns {Promise<Sensor[]>} Una promesa que se resuelve con un array de sensores.
 */
const getSensors = async (tankId?: string): Promise<Sensor[]> => {
  const response = await api.get('/sensors', { params: { tankId } });
  return response.data;
};

/**
 * Obtiene todos los sensores sin agrupar por tanque.
 * @returns {Promise<Sensor[]>} Una promesa que se resuelve con un array de todos los sensores.
 */
const getAllSensors = async (): Promise<Sensor[]> => {
  const response = await api.get('/sensors/all');
  return response.data;
};

/**
 * Obtiene un sensor específico por su ID.
 * @param {string} id - El ID del sensor a obtener.
 * @returns {Promise<Sensor>} Una promesa que se resuelve con los datos del sensor.
 */
const getSensorById = async (id: string): Promise<Sensor> => {
  const response = await api.get(`/sensors/${id}`);
  return response.data;
};

/**
 * Crea un nuevo sensor.
 * @param {CreateSensorDto} sensorData - Los datos para el nuevo sensor.
 * @returns {Promise<Sensor>} Una promesa que se resuelve con los datos del sensor creado.
 */
const createSensor = async (sensorData: CreateSensorDto): Promise<Sensor> => {
  const response = await api.post('/sensors', sensorData);
  return response.data;
};

/**
 * Actualiza un sensor existente.
 * @param {string} id - El ID del sensor a actualizar.
 * @param {UpdateSensorDto} sensorData - Los nuevos datos para el sensor.
 * @returns {Promise<Sensor>} Una promesa que se resuelve con los datos del sensor actualizado.
 */
const updateSensor = async (id: string, sensorData: UpdateSensorDto): Promise<Sensor> => {
  const response = await api.put(`/sensors/${id}`, sensorData);
  return response.data;
};

/**
 * Elimina un sensor.
 * @param {string} id - El ID del sensor a eliminar.
 * @returns {Promise<void>} Una promesa que se resuelve cuando el sensor ha sido eliminado.
 */
const deleteSensor = async (id: string): Promise<void> => {
  await api.delete(`/sensors/${id}`);
};

/**
 * @description Objeto que agrupa y exporta todos los métodos del servicio de sensores.
 */
export const sensorService = {
  getSensors,
  getAllSensors,
  getSensorById,
  createSensor,
  updateSensor,
  deleteSensor,
};