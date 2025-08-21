import { api } from '@/config/api';
import { SensorData, SensorType } from '@/types';

/**
 * Obtiene los últimos datos de los sensores.
 * @param tankId - El ID del tanque del que se quieren obtener los datos.
 * @param sensorType - (Opcional) El tipo de sensor a filtrar.
 */
export const getLatestData = async (tankId?: string, sensorType?: SensorType): Promise<SensorData[]> => {
  try {
    const params = new URLSearchParams();
    if (tankId) {
      params.append('tankId', tankId);
    }
    if (sensorType) {
      params.append('type', sensorType);
    }
    
    const response = await api.get(`/data/latest?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching latest sensor data:', error);
    throw error;
  }
};

/**
 * Obtiene el historial de datos de un sensor específico.
 * @param sensorId - El ID del sensor.
 * @param from - Fecha de inicio (ISO string).
 * @param to - Fecha de fin (ISO string).
 */
export const getHistoricalData = async (sensorId: string, from: string, to: string): Promise<SensorData[]> => {
  try {
    const params = new URLSearchParams({ from, to });
    const response = await api.get(`/data/historical/${sensorId}?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching historical data for sensor ${sensorId}:`, error);
    throw error;
  }
};
