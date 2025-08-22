/**
 * @file sensorService.ts
 * @description Servicio para gestionar las operaciones CRUD de sensores.
 * @author kevin mariano
 * @version 1.2.0
 * @since 1.0.0
 */
import api from '@/config/api';
import { Sensor, CreateSensorDto, UpdateSensorDto } from '@/types';

/**
 * @description Obtiene todos los sensores.
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
}

// ... (las demás funciones como getSensorById, createSensor, etc. se mantienen igual)

export const sensorService = {
  getSensors, // Estandarizado
  getSensorsByTank, // Estandarizado
  // ... exportar las demás funciones
};