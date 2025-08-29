/**
 * @file dashboardService.ts  
 * @description Servicio específico para obtener datos del Dashboard desde la API.
 * @author Kevin Mariano
 * @version 1.0.0
 */
import api from '@/config/api';

export interface DashboardFilters {
  userId?: number;
  tankId?: string;
  startDate?: string;
  endDate?: string;
}

export interface DashboardData {
  latestData: {
    temperature?: number | null;
    ph?: number | null;
    oxygen?: number | null;
  } | null;
  summary: {
    avg: {
      temperature?: number | null;
      ph?: number | null;
      oxygen?: number | null;
    };
    max: {
      temperature?: number | null;
      ph?: number | null;
      oxygen?: number | null;
    };
    min: {
      temperature?: number | null;
      ph?: number | null;
      oxygen?: number | null;
    };
  };
  timeSeries: Array<{
    timestamp: string;
    temperature?: number | null;
    ph?: number | null;
    oxygen?: number | null;
  }>;
}

/**
 * @function getDashboardData
 * @description Obtiene todos los datos necesarios para el dashboard aplicando filtros
 * @param filters Filtros para la consulta
 * @returns Promise con los datos del dashboard
 */
export const getDashboardData = async (filters: DashboardFilters): Promise<DashboardData> => {
  try {
    const params: any = {};
    
    if (filters.userId) params.userId = filters.userId;
    if (filters.tankId) params.tankId = filters.tankId;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;

    console.log('🔍 Fetching dashboard data with filters:', params);
    
    const response = await api.get('/dashboard', { params });
    
    console.log('✅ Dashboard data received:', response.data);
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching dashboard data:', error);
    throw error;
  }
};