import api from '../config/api';
import { Sensor } from '../types';

export const getSensors = async (userId?: string): Promise<Sensor[]> => {
    const response = await api.get('/sensors', { params: userId ? { userId } : {} });
    return response.data;
};
export const getSensorById = async (id: string): Promise<Sensor> => {
    const response = await api.get(`/sensors/${id}`);
    return response.data;
};
export const createSensor = async (sensorData: Partial<Sensor>): Promise<Sensor> => {
    const response = await api.post('/sensors', sensorData);
    return response.data;
};
export const updateSensor = async (id: string, sensorData: Partial<Sensor>): Promise<Sensor> => {
    const response = await api.put(`/sensors/${id}`, sensorData);
    return response.data;
};
export const deleteSensor = async (id: string): Promise<void> => {
    await api.delete(`/sensors/${id}`);
};