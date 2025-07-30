import api from '../config/api';

export const submitManualEntry = (data: { sensorId: string, temperature: number, ph: number, oxygen: number }) => {
    return api.post('/data/manual-entry', data);
};

export const getEmitterStatus = async (): Promise<string[]> => {
    const response = await api.get('/data/synthetic/status');
    return response.data.data;
};

export const startEmitter = (sensorId: string) => {
    return api.post('/data/synthetic/start', { sensorId });
};

export const stopEmitter = (sensorId: string) => {
    return api.post('/data/synthetic/stop', { sensorId });
};