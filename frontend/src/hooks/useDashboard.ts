/**
 * @file useDashboard.ts
 * @description Hook personalizado para la gestión del estado del dashboard.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/utils/apiClient';
import { SensorType } from '@/types';

interface DashboardFilters {
  userId?: string;
  tankId?: string;
  sensorType?: SensorType;
  startDate?: string;
  endDate?: string;
}

interface SummaryData {
  tanksCount: number;
  sensorsCount: number;
  activeSimulations: number;
  recentAlerts: number;
  totalDataPoints: number;
}

interface RealtimeData {
  [key: string]: Array<{
    sensorId: string;
    sensorName: string;
    tankName: string;
    value: number;
    timestamp: string;
    hardwareId: string;
  }>;
}

interface HistoricalData {
  timestamp: string;
  value: number;
  sensorName: string;
  sensorType: SensorType;
  tankName: string;
}

interface TankOverview {
  id: string;
  name: string;
  location: string;
  status: string;
  sensorsCount: number;
  lastReading: string | null;
  sensors: Array<{
    id: string;
    name: string;
    type: SensorType;
    status: string;
    lastValue: number | null;
    lastUpdate: string | null;
  }>;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  _count: { tanks: number };
}

export const useDashboard = () => {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeData>({});
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [tanksOverview, setTanksOverview] = useState<TankOverview[]>([]);
  const [usersList, setUsersList] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async (filters: DashboardFilters = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/dashboard/summary', { params: filters });
      setSummaryData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar el resumen');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRealtimeData = useCallback(async (filters: DashboardFilters = {}) => {
    try {
      const response = await apiClient.get('/dashboard/realtime', { params: filters });
      setRealtimeData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datos en tiempo real');
    }
  }, []);

  const fetchHistoricalData = useCallback(async (filters: DashboardFilters) => {
    try {
      setLoading(true);
      const response = await apiClient.get('/dashboard/historical', { params: filters });
      setHistoricalData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datos históricos');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTanksOverview = useCallback(async (filters: DashboardFilters = {}) => {
    try {
      const response = await apiClient.get('/dashboard/tanks-overview', { params: filters });
      setTanksOverview(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar vista de tanques');
    }
  }, []);

  const fetchUsersList = useCallback(async () => {
    try {
      const response = await apiClient.get('/dashboard/users-list');
      setUsersList(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar lista de usuarios');
    }
  }, []);

  return {
    summaryData,
    realtimeData,
    historicalData,
    tanksOverview,
    usersList,
    loading,
    error,
    fetchSummary,
    fetchRealtimeData,
    fetchHistoricalData,
    fetchTanksOverview,
    fetchUsersList,
  };
};