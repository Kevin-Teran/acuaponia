import api from '../config/api';
import { Sensor } from '../types';

export const getSensors = async (): Promise<Sensor[]> => {
    const response = await api.get('/sensors');
    return response.data.data;
};

export const startEmitter = (sensorIds: string[]) => {
    return api.post('/data/synthetic/start', sensorIds);
};

export const createSensor = async (sensorData: Partial<Sensor>): Promise<Sensor> => {
    const response = await api.post('/sensors', sensorData);
    return response.data.data;
};

export const updateSensor = async (id: string, sensorData: Partial<Sensor>): Promise<Sensor> => {
    const response = await api.put(`/sensors/${id}`, sensorData);
    return response.data.data;
};

export const deleteSensor = async (id: string): Promise<void> => {
    await api.delete(`/sensors/${id}`);
};

export const getSensorsByTank = async (tankId: string): Promise<Sensor[]> => {
    const response = await api.get(`/sensors/tank/${tankId}`);
    return response.data.data;
};