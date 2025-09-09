/**
 * @file useAnalytics.ts
 * @route frontend/src/hooks/
 * @description Hook personalizado para manejar la lógica de la página de analíticas - VERSIÓN CORREGIDA.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import { useState, useCallback } from 'react';
import * as analyticsService from '@/services/analyticsService';
import { Kpi, TimeSeriesData, AlertSummary, CorrelationData, SensorType } from '@/types';

interface LoadingState {
  kpis: boolean;
  timeSeries: boolean;
  alerts: boolean;
  correlation: boolean;
}

interface AnalyticsFilters {
  userId?: string;
  tankId?: string;
  sensorId?: string;
  sensorType?: string;
  range?: string;
  startDate?: string;
  endDate?: string;
}

interface CorrelationFilters extends Omit<AnalyticsFilters, 'sensorType'> {
  sensorTypeX: string;
  sensorTypeY: string;
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

  const validateFilters = useCallback((filters: AnalyticsFilters): AnalyticsFilters => {
    const validatedFilters: Partial<AnalyticsFilters> = {};
    for (const key in filters) {
      const value = filters[key as keyof AnalyticsFilters];
      if (value && value !== 'ALL' && value !== '') {
        validatedFilters[key as keyof AnalyticsFilters] = value;
      }
    }
    if (!validatedFilters.range) {
      validatedFilters.range = 'week';
    }
    return validatedFilters as AnalyticsFilters;
  }, []);

  const fetchData = useCallback(async (filters: AnalyticsFilters) => {
    console.log('🚀 [useAnalytics] Iniciando fetchData con filtros:', filters);
    setError(null);
    setLoading({ kpis: true, timeSeries: true, alerts: true, correlation: true });

    const cleanFilters = validateFilters(filters);
    
    try {
      const { sensorType, ...baseCorrelationFilters } = cleanFilters;

      const correlationFilters: CorrelationFilters = {
        ...baseCorrelationFilters,
        sensorTypeX: SensorType.TEMPERATURE,
        sensorTypeY: SensorType.PH,
      };

      console.log('📡 [useAnalytics] Ejecutando peticiones en paralelo con filtros:', { cleanFilters, correlationFilters });

      const [kpisResult, tsResult, summaryResult, corrResult] = await Promise.allSettled([
        analyticsService.getKpis(cleanFilters),
        analyticsService.getTimeSeries(cleanFilters),
        analyticsService.getAlertsSummary(cleanFilters),
        analyticsService.getCorrelations(correlationFilters),
      ]);

      if (kpisResult.status === 'fulfilled') setKpis(kpisResult.value);
      else { console.error('❌ Error KPIs:', kpisResult.reason); setKpis(null); }

      if (tsResult.status === 'fulfilled') setTimeSeriesData(tsResult.value);
      else { console.error('❌ Error TimeSeries:', tsResult.reason); setTimeSeriesData([]); }

      if (summaryResult.status === 'fulfilled') setAlertsSummary(summaryResult.value);
      else { console.error('❌ Error AlertsSummary:', summaryResult.reason); setAlertsSummary(null); }

      if (corrResult.status === 'fulfilled') setCorrelationData(corrResult.value);
      else { console.error('❌ Error Correlations:', corrResult.reason); setCorrelationData([]); }

    } catch (err: any) {
      console.error('💥 [useAnalytics] Error general:', err);
      setError(err.response?.data?.message || 'No se pudieron cargar todos los datos de analíticas.');
    } finally {
      setLoading({ kpis: false, timeSeries: false, alerts: false, correlation: false });
      console.log('🏁 [useAnalytics] fetchData completado');
    }
  }, [validateFilters]);

  const resetState = useCallback(() => {
    console.log('🔄 [useAnalytics] Reseteando estado');
    setKpis(null);
    setTimeSeriesData([]);
    setAlertsSummary(null);
    setCorrelationData([]);
    setError(null);
    setLoading({ kpis: false, timeSeries: false, alerts: false, correlation: false });
  }, []);

  return { kpis, timeSeriesData, alertsSummary, correlationData, loading, error, fetchData, resetState };
};