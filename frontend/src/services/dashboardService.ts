/**
 * @file dashboardService.ts
 * @route frontend/src/services
 * @description Servicio para manejar la comunicación con el backend del Dashboard.
 * Incluye fetch de datos y manejo de filtros.
 * @author Kevin Mariano 
 * @version 1.0.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import axios from "axios";

export interface DashboardFilters {
  tankId: string;
  startDate: string; 
  endDate: string;   
}

export interface SensorDataPoint {
  timestamp: string;
  value: number;
  type: string;
}

export interface LatestData {
  temperature?: number;
  ph?: number;
  oxygen?: number;
}

export interface DashboardSummary {
  totalAlerts: number;
  activeSensors: number;
}

export interface DashboardData {
  latestData: LatestData;
  summary: DashboardSummary;
  timeSeries: SensorDataPoint[];
}

/**
 * Obtiene los datos del dashboard desde el backend
 * @param filters filtros aplicados (tankId, startDate, endDate)
 * @returns Promise<DashboardData>
 */
export const fetchDashboardData = async (filters: DashboardFilters): Promise<DashboardData> => {
  try {
    console.log("🔍 Fetching dashboard data with filters:", filters);
    const response = await axios.get<DashboardData>("/api/dashboard", { params: filters });
    const data = response.data;

    if (!data.timeSeries) data.timeSeries = [];

    console.log("✅ Dashboard data received:", data);
    return data;
  } catch (error) {
    console.error("❌ Error fetching dashboard data:", error);
    return {
      latestData: {},
      summary: { totalAlerts: 0, activeSensors: 0 },
      timeSeries: [],
    };
  }
};
