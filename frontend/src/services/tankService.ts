import api from '../config/api';
import { Tank } from '../types';

export const getTanks = async (): Promise<Tank[]> => {
    const response = await api.get('/tanks');
    return response.data.data;
};

export const createTank = async (tankData: Omit<Tank, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Tank> => {
    const response = await api.post('/tanks', tankData);
    return response.data.data;
};

export const updateTank = async (id: string, tankData: Partial<Tank>): Promise<Tank> => {
    const response = await api.put(`/tanks/${id}`, tankData);
    return response.data.data;
};

export const deleteTank = async (id: string): Promise<void> => {
    await api.delete(`/tanks/${id}`);
};

export const getTanksByUser = async (userId: string): Promise<Tank[]> => {
    const response = await api.get(`/tanks/user/${userId}`);
    return response.data.data;
};