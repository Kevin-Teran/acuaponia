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

/**
 * @interface LoadingState
 * @description Estado de carga para cada tipo de consulta
 */
interface LoadingState {
  kpis: boolean;
  timeSeries: boolean;
  alerts: boolean;
  correlation: boolean;
}

/**
 * @interface AnalyticsFilters
 * @description Filtros para las consultas de analíticas
 */
interface AnalyticsFilters {
  userId?: string;
  tankId?: string;
  sensorId?: string;
  sensorType?: string;
  range?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * @interface CorrelationFilters
 * @description Filtros específicos para consultas de correlación
 */
interface CorrelationFilters extends AnalyticsFilters {
  sensorTypeX?: string;
  sensorTypeY?: string;
}

/**
 * @hook useAnalytics
 * @description Hook personalizado que encapsula la lógica de estado y peticiones para analíticas.
 * @returns {object} Estado y funciones para manejar datos de analíticas
 */
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

  /**
   * @function validateFilters
   * @description Valida y limpia los filtros antes de enviarlos a la API.
   * @private
   * @param {AnalyticsFilters} filters - Filtros a validar
   * @returns {AnalyticsFilters} Filtros validados
   */
  const validateFilters = useCallback((filters: AnalyticsFilters): AnalyticsFilters => {
    const validatedFilters = { ...filters };

    if (validatedFilters.tankId === 'ALL' || validatedFilters.tankId === '') {
      delete validatedFilters.tankId;
    }
    if (validatedFilters.sensorId === 'ALL' || validatedFilters.sensorId === '') {
      delete validatedFilters.sensorId;
    }
    if (!validatedFilters.sensorType || validatedFilters.sensorType === '') {
      delete validatedFilters.sensorType;
    }

    if (!validatedFilters.range) {
      validatedFilters.range = 'week';
    }

    return validatedFilters;
  }, []);

  /**
   * @function fetchData
   * @description Función principal para obtener todos los datos de analíticas en paralelo.
   * @param {AnalyticsFilters} filters - Filtros para las consultas
   */
  const fetchData = useCallback(async (filters: AnalyticsFilters) => {
    console.log('🚀 [useAnalytics] Iniciando fetchData con filtros:', filters);
    
    setError(null);

    const cleanFilters = validateFilters(filters);
    console.log('🧹 [useAnalytics] Filtros limpiados:', cleanFilters);

    setLoading({ kpis: true, timeSeries: true, alerts: true, correlation: true });
    
    try {
      const correlationFilters: CorrelationFilters = {
        ...cleanFilters,
        sensorTypeX: SensorType.TEMPERATURE,
        sensorTypeY: SensorType.PH,
      };

      console.log('📡 [useAnalytics] Ejecutando peticiones en paralelo...');

      const [kpisResult, tsResult, summaryResult, corrResult] = await Promise.allSettled([
        analyticsService.getKpis(cleanFilters),
        analyticsService.getTimeSeries(cleanFilters),
        analyticsService.getAlertsSummary(cleanFilters),
        analyticsService.getCorrelations(correlationFilters),
      ]);

      if (kpisResult.status === 'fulfilled') {
        console.log('✅ [useAnalytics] KPIs procesados exitosamente');
        setKpis(kpisResult.value);
      } else {
        console.error('❌ [useAnalytics] Error obteniendo KPIs:', kpisResult.reason);
        setKpis(null);
      }

      if (tsResult.status === 'fulfilled') {
        console.log('✅ [useAnalytics] Series temporales procesadas exitosamente:', tsResult.value.length, 'puntos');
        setTimeSeriesData(tsResult.value);
      } else {
        console.error('❌ [useAnalytics] Error obteniendo series temporales:', tsResult.reason);
        setTimeSeriesData([]);
      }

      if (summaryResult.status === 'fulfilled') {
        console.log('✅ [useAnalytics] Resumen de alertas procesado exitosamente');
        setAlertsSummary(summaryResult.value);
      } else {
        console.error('❌ [useAnalytics] Error obteniendo resumen de alertas:', summaryResult.reason);
        setAlertsSummary(null);
      }

      if (corrResult.status === 'fulfilled') {
        console.log('✅ [useAnalytics] Correlaciones procesadas exitosamente:', corrResult.value.length, 'puntos');
        setCorrelationData(corrResult.value);
      } else {
        console.error('❌ [useAnalytics] Error obteniendo correlaciones:', corrResult.reason);
        setCorrelationData([]);
      }

    } catch (err) {
      console.error('💥 [useAnalytics] Error general al obtener datos de analíticas:', err);
      setError('No se pudieron cargar todos los datos de analíticas.');
    } finally {
      setLoading({ kpis: false, timeSeries: false, alerts: false, correlation: false });
      console.log('🏁 [useAnalytics] fetchData completado');
    }
  }, [validateFilters]);

  /**
   * @function fetchKpis
   * @description Función específica para obtener solo los KPIs.
   * @param {AnalyticsFilters} filters - Filtros para la consulta
   */
  const fetchKpis = useCallback(async (filters: AnalyticsFilters) => {
    console.log('📊 [useAnalytics] Fetching KPIs:', filters);
    
    setLoading(prev => ({ ...prev, kpis: true }));
    setError(null);
    
    try {
      const cleanFilters = validateFilters(filters);
      const data = await analyticsService.getKpis(cleanFilters);
      setKpis(data);
      console.log('✅ [useAnalytics] KPIs obtenidos:', data);
    } catch (err: any) {
      console.error('❌ [useAnalytics] Error obteniendo KPIs:', err);
      setError('No se pudieron cargar los KPIs.');
      setKpis(null);
    } finally {
      setLoading(prev => ({ ...prev, kpis: false }));
    }
  }, [validateFilters]);

  /**
   * @function fetchTimeSeries
   * @description Función específica para obtener datos de series temporales.
   * @param {AnalyticsFilters} filters - Filtros para la consulta
   */
  const fetchTimeSeries = useCallback(async (filters: AnalyticsFilters) => {
    console.log('📈 [useAnalytics] Fetching TimeSeries:', filters);
    
    setLoading(prev => ({ ...prev, timeSeries: true }));
    setError(null);
    
    try {
      const cleanFilters = validateFilters(filters);
      const data = await analyticsService.getTimeSeries(cleanFilters);
      setTimeSeriesData(data);
      console.log('✅ [useAnalytics] Series temporales obtenidas:', data.length);
    } catch (err: any) {
      console.error('❌ [useAnalytics] Error obteniendo series temporales:', err);
      setError('No se pudieron cargar los datos de series temporales.');
      setTimeSeriesData([]);
    } finally {
      setLoading(prev => ({ ...prev, timeSeries: false }));
    }
  }, [validateFilters]);

  /**
   * @function fetchAlertsSummary
   * @description Función específica para obtener el resumen de alertas.
   * @param {AnalyticsFilters} filters - Filtros para la consulta
   */
  const fetchAlertsSummary = useCallback(async (filters: AnalyticsFilters) => {
    console.log('🚨 [useAnalytics] Fetching AlertsSummary:', filters);
    
    setLoading(prev => ({ ...prev, alerts: true }));
    setError(null);
    
    try {
      const cleanFilters = validateFilters(filters);
      const data = await analyticsService.getAlertsSummary(cleanFilters);
      setAlertsSummary(data);
      console.log('✅ [useAnalytics] Resumen de alertas obtenido:', data);
    } catch (err: any) {
      console.error('❌ [useAnalytics] Error obteniendo resumen de alertas:', err);
      setError('No se pudo cargar el resumen de alertas.');
      setAlertsSummary(null);
    } finally {
      setLoading(prev => ({ ...prev, alerts: false }));
    }
  }, [validateFilters]);

  /**
   * @function fetchCorrelations
   * @description Función específica para obtener datos de correlación.
   * @param {CorrelationFilters} filters - Filtros para la correlación
   */
  const fetchCorrelations = useCallback(async (filters: CorrelationFilters) => {
    console.log('🔗 [useAnalytics] Fetching Correlations:', filters);
    
    setLoading(prev => ({ ...prev, correlation: true }));
    setError(null);
    
    try {
      const cleanFilters = validateFilters(filters);
      const filtersWithDefaults = {
        ...cleanFilters,
        sensorTypeX: filters.sensorTypeX || SensorType.TEMPERATURE,
        sensorTypeY: filters.sensorTypeY || SensorType.PH,
      };
      
      const data = await analyticsService.getCorrelations(filtersWithDefaults);
      setCorrelationData(data);
      console.log('✅ [useAnalytics] Correlaciones obtenidas:', data.length);
    } catch (err: any) {
      console.error('❌ [useAnalytics] Error obteniendo correlaciones:', err);
      setError('No se pudieron cargar los datos de correlación.');
      setCorrelationData([]);
    } finally {
      setLoading(prev => ({ ...prev, correlation: false }));
    }
  }, [validateFilters]);

  /**
   * @function resetState
   * @description Reinicia todos los estados a sus valores iniciales.
   */
  const resetState = useCallback(() => {
    console.log('🔄 [useAnalytics] Reseteando estado');
    
    setKpis(null);
    setTimeSeriesData([]);
    setAlertsSummary(null);
    setCorrelationData([]);
    setError(null);
    setLoading({ kpis: false, timeSeries: false, alerts: false, correlation: false });
  }, []);

  return {
    kpis,
    timeSeriesData,
    alertsSummary,
    correlationData,
    loading,
    error,
    fetchData,
    fetchKpis,
    fetchTimeSeries,
    fetchAlertsSummary,
    fetchCorrelations,
    resetState,
  };
};