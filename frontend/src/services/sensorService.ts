import { api } from '@/config/api';
import { Sensor } from '@/types';

/**
 * Obtiene todos los sensores asociados a un tanque específico.
 * @param tankId - El ID del tanque.
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
 * Obtiene todos los sensores registrados en el sistema.
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
 * Crea un nuevo sensor.
 * @param sensorData - Los datos del sensor a crear.
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
 * @param id - El ID del sensor a actualizar.
 * @param sensorData - Los datos a actualizar.
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
 * Elimina un sensor.
 * @param id - El ID del sensor a eliminar.
 */
export const deleteSensor = async (id: string): Promise<void> => {
  try {
    await api.delete(`/sensors/${id}`);
  } catch (error) {
    console.error(`Error deleting sensor ${id}:`, error);
    throw error;
  }
};
