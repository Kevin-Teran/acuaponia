import { api } from '@/config/api';
import { Sensor } from '@/types';

/**
 * Obtiene todos los sensores asociados a un usuario específico.
 * Esta función es útil para obtener una lista completa de sensores
 * que un usuario puede gestionar, antes de filtrar por tanque.
 *
 * @param {string} userId - El ID del usuario.
 * @returns {Promise<Sensor[]>} Una promesa que resuelve a un arreglo de sensores.
 * @throws {Error} Lanza un error si la petición a la API falla.
 */
export const getSensors = async (userId: string): Promise<Sensor[]> => {
    try {
        const response = await api.get(`/sensors?userId=${userId}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching sensors for user ${userId}:`, error);
        throw error;
    }
};

/**
 * Obtiene todos los sensores asociados a un tanque específico.
 *
 * @param {string} tankId - El ID del tanque.
 * @returns {Promise<Sensor[]>} Una promesa que resuelve a un arreglo de sensores.
 * @throws {Error} Lanza un error si la petición a la API falla.
 */
export const getSensorsByTank = async (tankId: string): Promise<Sensor[]> => {
  try {
    const response = await api.get(`/sensors?tankId=${tankId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching sensors for tank ${tankId}:`, error);
    throw error;
  }
};

/**
 * Obtiene todos los sensores registrados en el sistema (ruta para administradores).
 *
 * @returns {Promise<Sensor[]>} Una promesa que resuelve a un arreglo con todos los sensores.
 * @throws {Error} Lanza un error si la petición a la API falla.
 */
export const getAllSensors = async (): Promise<Sensor[]> => {
  try {
    const response = await api.get('/sensors/all');
    return response.data;
  } catch (error) {
    console.error('Error fetching all sensors:', error);
    throw error;
  }
};

/**
 * @typedef {Omit<Sensor, 'id'>} SensorCreationData
 * @description Define la estructura de datos para crear un nuevo sensor,
 * omitiendo el campo 'id' que es generado por el backend.
 */

/**
 * Crea un nuevo sensor en el sistema.
 *
 * @param {SensorCreationData} sensorData - Los datos del sensor a crear.
 * @returns {Promise<Sensor>} Una promesa que resuelve al objeto del sensor creado.
 * @throws {Error} Lanza un error si la petición a la API falla.
 */
export const createSensor = async (sensorData: Omit<Sensor, 'id'>): Promise<Sensor> => {
  try {
    const response = await api.post('/sensors', sensorData);
    return response.data;
  } catch (error) {
    console.error('Error creating sensor:', error);
    throw error;
  }
};

/**
 * Actualiza un sensor existente.
 *
 * @param {string} id - El ID del sensor a actualizar.
 * @param {Partial<Sensor>} sensorData - Los datos a actualizar del sensor.
 * @returns {Promise<Sensor>} Una promesa que resuelve al objeto del sensor actualizado.
 * @throws {Error} Lanza un error si la petición a la API falla.
 */
export const updateSensor = async (id: string, sensorData: Partial<Sensor>): Promise<Sensor> => {
  try {
    const response = await api.put(`/sensors/${id}`, sensorData);
    return response.data;
  } catch (error) {
    console.error(`Error updating sensor ${id}:`, error);
    throw error;
  }
};

/**
 * Elimina un sensor del sistema.
 *
 * @param {string} id - El ID del sensor a eliminar.
 * @returns {Promise<void>} Una promesa que resuelve cuando el sensor ha sido eliminado.
 * @throws {Error} Lanza un error si la petición a la API falla.
 */
export const deleteSensor = async (id: string): Promise<void> => {
  try {
    await api.delete(`/sensors/${id}`);
  } catch (error) {
    console.error(`Error deleting sensor ${id}:`, error);
    throw error;
  }
};