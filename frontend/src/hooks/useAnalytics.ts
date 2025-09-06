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
  // Estados para los datos
  const [kpis, setKpis] = useState<Kpi | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [alertsSummary, setAlertsSummary] = useState<AlertSummary | null>(null);
  const [correlationData, setCorrelationData] = useState<CorrelationData[]>([]);
  
  // Estados de carga
  const [loading, setLoading] = useState<LoadingState>({
    kpis: false,
    timeSeries: false,
    alerts: false,
    correlation: false,
  });
  
  // Estado de error
  const [error, setError] = useState<string | null>(null);

  /**
   * @function fetchData
   * @description Función principal para obtener todos los datos de analíticas en paralelo.
   * @param {AnalyticsFilters} filters - Filtros para las consultas
   */
  const fetchData = useCallback(async (filters: AnalyticsFilters) => {
    setError(null);

    // Activar todos los estados de carga
    setLoading({ kpis: true, timeSeries: true, alerts: true, correlation: true });
    
    try {
      // Preparar filtros de correlación con valores por defecto
      const correlationFilters: CorrelationFilters = {
        ...filters,
        sensorTypeX: 'TEMPERATURE', // Valor por defecto
        sensorTypeY: 'PH',         // Valor por defecto
      };

      // Ejecutar todas las peticiones en paralelo para mayor eficiencia
      const [kpisData, tsData, summaryData, corrData] = await Promise.allSettled([
        analyticsService.getKpis(filters),
        analyticsService.getTimeSeries(filters),
        analyticsService.getAlertsSummary(filters),
        analyticsService.getCorrelations(correlationFilters),
      ]);

      // Procesar resultados de KPIs
      if (kpisData.status === 'fulfilled') {
        setKpis(kpisData.value);
      } else {
        console.error('Error obteniendo KPIs:', kpisData.reason);
      }

      // Procesar resultados de series temporales
      if (tsData.status === 'fulfilled') {
        setTimeSeriesData(tsData.value);
      } else {
        console.error('Error obteniendo series temporales:', tsData.reason);
        setTimeSeriesData([]);
      }

      // Procesar resultados de resumen de alertas
      if (summaryData.status === 'fulfilled') {
        setAlertsSummary(summaryData.value);
      } else {
        console.error('Error obteniendo resumen de alertas:', summaryData.reason);
      }

      // Procesar resultados de correlaciones
      if (corrData.status === 'fulfilled') {
        setCorrelationData(corrData.value);
      } else {
        console.error('Error obteniendo correlaciones:', corrData.reason);
        setCorrelationData([]);
      }

    } catch (err) {
      console.error('Error general al obtener datos de analíticas:', err);
      setError('No se pudieron cargar todos los datos de analíticas.');
    } finally {
      // Desactivar todos los estados de carga
      setLoading({ kpis: false, timeSeries: false, alerts: false, correlation: false });
    }
  }, []);

  /**
   * @function fetchKpis
   * @description Función específica para obtener solo los KPIs.
   * @param {AnalyticsFilters} filters - Filtros para la consulta
   */
  const fetchKpis = useCallback(async (filters: AnalyticsFilters) => {
    setLoading(prev => ({ ...prev, kpis: true }));
    setError(null);
    
    try {
      const data = await analyticsService.getKpis(filters);
      setKpis(data);
    } catch (err) {
      console.error('Error obteniendo KPIs:', err);
      setError('No se pudieron cargar los KPIs.');
    } finally {
      setLoading(prev => ({ ...prev, kpis: false }));
    }
  }, []);

  /**
   * @function fetchTimeSeries
   * @description Función específica para obtener datos de series temporales.
   * @param {AnalyticsFilters} filters - Filtros para la consulta
   */
  const fetchTimeSeries = useCallback(async (filters: AnalyticsFilters) => {
    setLoading(prev => ({ ...prev, timeSeries: true }));
    setError(null);
    
    try {
      const data = await analyticsService.getTimeSeries(filters);
      setTimeSeriesData(data);
    } catch (err) {
      console.error('Error obteniendo series temporales:', err);
      setError('No se pudieron cargar los datos de series temporales.');
    } finally {
      setLoading(prev => ({ ...prev, timeSeries: false }));
    }
  }, []);

  /**
   * @function fetchAlertsSummary
   * @description Función específica para obtener el resumen de alertas.
   * @param {AnalyticsFilters} filters - Filtros para la consulta
   */
  const fetchAlertsSummary = useCallback(async (filters: AnalyticsFilters) => {
    setLoading(prev => ({ ...prev, alerts: true }));
    setError(null);
    
    try {
      const data = await analyticsService.getAlertsSummary(filters);
      setAlertsSummary(data);
    } catch (err) {
      console.error('Error obteniendo resumen de alertas:', err);
      setError('No se pudo cargar el resumen de alertas.');
    } finally {
      setLoading(prev => ({ ...prev, alerts: false }));
    }
  }, []);

  /**
   * @function fetchCorrelations
   * @description Función específica para obtener datos de correlación.
   * @param {CorrelationFilters} filters - Filtros para la correlación
   */
  const fetchCorrelations = useCallback(async (filters: CorrelationFilters) => {
    setLoading(prev => ({ ...prev, correlation: true }));
    setError(null);
    
    try {
      const data = await analyticsService.getCorrelations(filters);
      setCorrelationData(data);
    } catch (err) {
      console.error('Error obteniendo correlaciones:', err);
      setError('No se pudieron cargar los datos de correlación.');
    } finally {
      setLoading(prev => ({ ...prev, correlation: false }));
    }
  }, []);

  // Retornar estado y funciones públicas
  return {
    // Estados de datos
    kpis,
    timeSeriesData,
    alertsSummary,
    correlationData,
    
    // Estados de carga
    loading,
    
    // Estado de error
    error,
    
    // Funciones públicas
    fetchData,
    fetchKpis,
    fetchTimeSeries,
    fetchAlertsSummary,
    fetchCorrelations,
  };
};