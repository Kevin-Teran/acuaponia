import api from '../config/api';
import { SensorData } from '../types';

/**
 * @desc     Get historical sensor data
 * @param    params - Query parameters for filtering
 * @returns  {Promise<SensorData[]>}
 */
export const getHistoricalData = async (params: any): Promise<SensorData[]> => {
    const response = await api.get('/data/historical', { params });
    return response.data.data.sensorData;
};