/**
 * @file sensorService.ts
 * @description Servicio para gestionar las operaciones CRUD de los sensores.
 * @author Sistema de Acuaponía SENA
 * @version 1.2.0
 * @since 1.0.0
 */

import api from '@/config/api';
import { Sensor, CreateSensorDto, UpdateSensorDto } from '@/types';

/**
 * Obtiene todos los sensores, opcionalmente filtrados por tanque.
 * @param {string} [tankId] - ID opcional del tanque para filtrar los sensores.
 * @returns {Promise<Sensor[]>} Una promesa que se resuelve con un array de sensores.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const getSensors = async (tankId?: string): Promise<Sensor[]> => {
  const response = await api.get('/sensors', { params: { tankId } });
  return response.data;
};

/**
 * Obtiene todos los sensores sin agrupar por tanque.
 * @returns {Promise<Sensor[]>} Una promesa que se resuelve con un array de todos los sensores.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const getAllSensors = async (): Promise<Sensor[]> => {
    const response = await api.get('/sensors/all');
    return response.data;
};

/**
 * Obtiene un sensor específico por su ID.
 * @param {string} id - El ID del sensor a obtener.
 * @returns {Promise<Sensor>} Una promesa que se resuelve con los datos del sensor.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const getSensorById = async (id: string): Promise<Sensor> => {
    const response = await api.get(`/sensors/${id}`);
    return response.data;
};

/**
 * Crea un nuevo sensor.
 * @param {CreateSensorDto} sensorData - Los datos para el nuevo sensor.
 * @returns {Promise<Sensor>} Una promesa que se resuelve con los datos del sensor creado.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const createSensor = async (sensorData: CreateSensorDto): Promise<Sensor> => {
  const response = await api.post('/sensors', sensorData);
  return response.data;
};

/**
 * Actualiza un sensor existente.
 * @param {string} id - El ID del sensor a actualizar.
 * @param {UpdateSensorDto} sensorData - Los nuevos datos para el sensor.
 * @returns {Promise<Sensor>} Una promesa que se resuelve con los datos del sensor actualizado.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const updateSensor = async (id: string, sensorData: UpdateSensorDto): Promise<Sensor> => {
  const response = await api.put(`/sensors/${id}`, sensorData);
  return response.data;
};

/**
 * Elimina un sensor.
 * @param {string} id - El ID del sensor a eliminar.
 * @returns {Promise<void>} Una promesa que se resuelve cuando el sensor ha sido eliminado.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const deleteSensor = async (id: string): Promise<void> => {
  await api.delete(`/sensors/${id}`);
};