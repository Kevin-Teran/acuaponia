/**
 * @file useAnalytics.ts
 * @route frontend/src/hooks/
 * @description Hook personalizado para manejar la lógica de la página de analíticas.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import { useState, useCallback } from 'react';
import * as analyticsService from '@/services/analyticsService';
import { Kpi, TimeSeriesData, AlertSummary, CorrelationData } from '@/types';

interface LoadingState {
  kpis: boolean;
  timeSeries: boolean;
  alerts: boolean;
  correlation: boolean;
}

interface AnalyticsFilters {
  tankId?: string;
  sensorType?: string;
  range?: string;
  userId?: string;
}

export const useAnalytics = () => {
  const [kpis, setKpis] = useState<Kpi | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [alertsSummary, setAlertsSummary] = useState<AlertSummary | null>(null);
  const [correlationData, setCorrelationData] = useState<CorrelationData[]>([]);
  const [loading, setLoading] = useState<LoadingState>({
    kpis: false,
    timeSeries: false,
    alerts: false,
    correlation: false,
  });
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (filters: AnalyticsFilters) => {
    setError(null);

    // Ejecutar todas las peticiones en paralelo para mayor eficiencia
    setLoading({ kpis: true, timeSeries: true, alerts: true, correlation: true });
    
    try {
      const [kpisData, tsData, summaryData, corrData] = await Promise.all([
        analyticsService.getKpis(filters),
        analyticsService.getTimeSeries(filters),
        analyticsService.getAlertsSummary(filters),
        analyticsService.getCorrelations(filters),
      ]);

      setKpis(kpisData);
      setTimeSeriesData(tsData);
      setAlertsSummary(summaryData);
      setCorrelationData(corrData);

    } catch (err) {
      console.error('Error al obtener datos de analíticas:', err);
      setError('No se pudieron cargar todos los datos de analíticas.');
    } finally {
      setLoading({ kpis: false, timeSeries: false, alerts: false, correlation: false });
    }
  }, []);

  return {
    kpis,
    timeSeriesData,
    alertsSummary,
    correlationData,
    loading,
    error,
    fetchData,
  };
};