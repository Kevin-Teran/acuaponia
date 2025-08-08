import api from '../config/api';
import { Tank } from '../types';

export const getTanks = async (userId?: string): Promise<Tank[]> => {
    const response = await api.get('/tanks', { params: userId ? { userId } : {} });
    return response.data;
};
export const createTank = async (tankData: Partial<Tank>): Promise<Tank> => {
    const response = await api.post('/tanks', tankData);
    return response.data;
};
export const updateTank = async (id: string, tankData: Partial<Tank>): Promise<Tank> => {
    const response = await api.put(`/tanks/${id}`, tankData);
    return response.data;
};
export const deleteTank = async (id: string): Promise<void> => {
    await api.delete(`/tanks/${id}`);
};