import api from '../config/api';
import { DashboardData } from '../types';

export const getDashboardData = async (params: {
  userId?: number;
  tankId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<DashboardData> => {
  try {
    const response = await api.get<DashboardData>('/dashboard', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    throw error;
  }
};