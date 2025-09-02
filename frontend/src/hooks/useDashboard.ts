/**
 * @file useDashboard.ts
 * @description Hook para obtener todos los datos necesarios para el dashboard.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */
import { useState, useCallback } from 'react';
import api from '@/config/api';
import { SensorType, UserFromApi as User } from '@/types';
import { SummaryData, RealtimeData, HistoricalDataPoint } from '@/types/dashboard';

// (El resto de las interfaces no cambian)

export const useDashboard = () => {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [realtimeData, setRealtimeData] = useState<RealtimeData>({});
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true); // Solo para la carga inicial
  const [error, setError] = useState<string | null>(null);

  // Se añade el parámetro 'isBackground' para evitar el parpadeo
  const fetcher = async (promise: Promise<any>, setter: (data: any) => void, isBackground = false) => {
    if (!isBackground) setLoading(true);
    setError(null);
    try {
      const { data } = await promise;
      setter(data);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Ocurrió un error';
      setError(errorMessage);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  const fetchSummary = useCallback((filters: any, isBackground = false) => {
    fetcher(api.get('/dashboard/summary', { params: filters }), setSummaryData, isBackground);
  }, []);

  const fetchRealtimeData = useCallback((filters: any, isBackground = false) => {
    fetcher(api.get('/dashboard/realtime', { params: filters }), setRealtimeData, isBackground);
  }, []);

  const fetchHistoricalData = useCallback((filters: any) => {
    if (!filters.startDate || !filters.endDate) return;
    fetcher(api.get('/dashboard/historical', { params: filters }), setHistoricalData);
  }, []);

  const fetchUsersList = useCallback(() => {
    fetcher(api.get('/dashboard/users'), setUsersList);
  }, []);

  return {
    summaryData, realtimeData, historicalData, usersList,
    loading, error,
    fetchSummary, fetchRealtimeData, fetchHistoricalData, fetchUsersList,
  };
};