/**
 * @file sensorService.ts
 * @description Servicio para gestionar las operaciones CRUD de sensores.
 * Versión corregida para exportar todas las funciones necesarias.
 * @author kevin mariano
 * @version 1.3.0
 * @since 1.0.0
 */
import api from '@/config/api';
import { Sensor, CreateSensorDto, UpdateSensorDto } from '@/types';

/**
 * @description Obtiene todos los sensores de todos los tanques.
 * @returns {Promise<Sensor[]>}
 */
const getSensors = async (): Promise<Sensor[]> => {
  const response = await api.get('/sensors/all');
  return response.data;
};

/**
 * @description Obtiene los sensores asociados a un tanque específico.
 * @param {string} tankId - ID del tanque.
 * @returns {Promise<Sensor[]>}
 */
const getSensorsByTank = async (tankId: string): Promise<Sensor[]> => {
    const response = await api.get(`/sensors`, { params: { tankId } });
    return response.data;
};

/**
 * @description Obtiene un sensor por su ID.
 * @param {string} id - ID del sensor.
 * @returns {Promise<Sensor>}
 */
const getSensorById = async (id: string): Promise<Sensor> => {
    const response = await api.get(`/sensors/${id}`);
    return response.data;
};

/**
 * @description Crea un nuevo sensor.
 * @param {CreateSensorDto} sensorData - Datos para crear el sensor.
 * @returns {Promise<Sensor>}
 */
const createSensor = async (sensorData: CreateSensorDto): Promise<Sensor> => {
    const response = await api.post('/sensors', sensorData);
    return response.data;
};

/**
 * @description Actualiza un sensor existente.
 * @param {string} id - ID del sensor a actualizar.
 * @param {UpdateSensorDto} sensorData - Datos para actualizar.
 * @returns {Promise<Sensor>}
 */
const updateSensor = async (id: string, sensorData: UpdateSensorDto): Promise<Sensor> => {
    const response = await api.put(`/sensors/${id}`, sensorData);
    return response.data;
};

/**
 * @description Elimina un sensor.
 * @param {string} id - ID del sensor a eliminar.
 * @returns {Promise<void>}
 */
const deleteSensor = async (id: string): Promise<void> => {
    await api.delete(`/sensors/${id}`);
};


export const sensorService = {
  getSensors,
  getSensorsByTank,
  getSensorById,
  createSensor,
  updateSensor,
  deleteSensor,
};