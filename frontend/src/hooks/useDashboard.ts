/**
 * @file useDashboard.ts
 * @route frontend/src/hooks/
 * @description Hook corregido para obtener todos los datos necesarios para el dashboard
 * con manejo mejorado de tipos y estados de carga.
 * @author Kevin Mariano
 * @version 1.0.1
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { useState, useCallback } from 'react';
import api from '@/config/api';
import { SensorType, UserFromApi as User } from '@/types';

export interface SummaryData {
  tanksCount: number;
  sensorsCount: number;
  activeSimulations: number;
  recentAlerts: number;
  totalDataPoints: number;
}

export interface RealtimeSensorData {
  sensorId: string;
  sensorName: string;
  tankName: string;
  value: number;
  timestamp: string;
  hardwareId: string;
  type: SensorType;
}

export interface RealtimeData {
  [SensorType.TEMPERATURE]?: RealtimeSensorData[];
  [SensorType.PH]?: RealtimeSensorData[];
  [SensorType.OXYGEN]?: RealtimeSensorData[];
}

export interface HistoricalDataPoint {
  timestamp: string;
  value: number;
  sensorName: string;
  sensorType: SensorType;
  tankName: string;
}

export interface TankOverview {
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

export const useDashboard = () => {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeData>({});
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [tanksOverview, setTanksOverview] = useState<TankOverview[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * @function fetcher
   * @description Función helper para manejar peticiones con estados de carga
   * @param {Promise<any>} promise - Promesa de la petición
   * @param {Function} setter - Función para establecer el estado
   * @param {boolean} isBackground - Si es una petición en segundo plano
   */
  const fetcher = async (promise: Promise<any>, setter: (data: any) => void, isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const { data } = await promise;
      setter(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Ocurrió un error inesperado';
      setError(errorMessage);
      console.error('Error en petición del dashboard:', err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  /**
   * @function fetchSummary
   * @description Obtiene el resumen de estadísticas del dashboard
   * @param {any} filters - Filtros aplicados
   * @param {boolean} isBackground - Si es una actualización en segundo plano
   */
  const fetchSummary = useCallback((filters: any, isBackground = false) => {
    fetcher(api.get('/dashboard/summary', { params: filters }), setSummaryData, isBackground);
  }, []);

  /**
   * @function fetchRealtimeData
   * @description Obtiene los datos en tiempo real de los sensores
   * @param {any} filters - Filtros aplicados
   * @param {boolean} isBackground - Si es una actualización en segundo plano
   */
  const fetchRealtimeData = useCallback((filters: any, isBackground = false) => {
    fetcher(api.get('/dashboard/realtime', { params: filters }), setRealtimeData, isBackground);
  }, []);

  /**
   * @function fetchHistoricalData
   * @description Obtiene los datos históricos para los gráficos
   * @param {any} filters - Filtros aplicados (requiere startDate y endDate)
   */
  const fetchHistoricalData = useCallback((filters: any) => {
    if (!filters.startDate || !filters.endDate) {
      console.warn('fetchHistoricalData requiere startDate y endDate');
      return;
    }
    fetcher(api.get('/dashboard/historical', { params: filters }), setHistoricalData);
  }, []);

  /**
   * @function fetchTanksOverview
   * @description Obtiene el resumen de todos los tanques
   * @param {any} filters - Filtros aplicados
   */
  const fetchTanksOverview = useCallback((filters: any) => {
    fetcher(api.get('/dashboard/tanks-overview', { params: filters }), setTanksOverview);
  }, []);

  /**
   * @function fetchUsersList
   * @description Obtiene la lista de usuarios (solo para administradores)
   */
  const fetchUsersList = useCallback(() => {
    fetcher(api.get('/dashboard/users'), setUsersList);
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