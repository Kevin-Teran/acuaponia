/**
 * @file useAnalytics.ts
 * @route frontend/src/hooks/
 * @description Hook personalizado para manejar la lógica de la página de analíticas - VERSIÓN FINAL CORREGIDA.
 * @author kevin mariano
 * @version 1.0.3
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import { useState, useCallback } from 'react';
import * as analyticsService from '@/services/analyticsService';
import { Kpi, AlertSummary, CorrelationData, SensorType } from '@/types';

// NUEVOS TIPOS DE DATOS
interface SingleTimeSeriesData { timestamp: string; value: number; }
type MultiTimeSeriesData = {
  timestamp: string;
  [key: string]: number | string | null;
};

// FILTROS MEJORADOS
interface AnalyticsFilters {
  userId?: string;
  tankId?: string;
  sensorId?: string;
  sensorType?: string; 
  range?: string;
  startDate?: string;
  endDate?: string;
  secondarySensorTypes?: string[]; 
  samplingFactor?: number; 
}

interface LoadingState {
  kpis: boolean;
  timeSeries: boolean;
  alerts: boolean;
  correlation: boolean;
}

interface CorrelationFilters extends Omit<AnalyticsFilters, 'sensorType'> {
  sensorTypeX: string;
  sensorTypeY: string;
}

// FUNCIÓN DE MUESTREO (ppapra arreglal lo de analytics)
const sampleData = (data: MultiTimeSeriesData[], samplingFactor: number): MultiTimeSeriesData[] => {
    const factor = samplingFactor > 0 ? samplingFactor : 1;
    if (!data || factor <= 1) return data;
    return data.filter((_, index) => index % factor === 0);
};

export const useAnalytics = () => {
  const [kpis, setKpis] = useState<Kpi | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<MultiTimeSeriesData[]>([]);
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
        
        if (Array.isArray(value) || typeof value === 'number') {
             validatedFilters[key as keyof AnalyticsFilters] = value as any;
             continue;
        }

        if (value !== undefined && value !== null) {
            if (typeof value === 'string' && (value === 'ALL' || value === '')) continue;
            validatedFilters[key as keyof AnalyticsFilters] = value as any;
        }
    }
    if (!validatedFilters.range) {
      validatedFilters.range = 'week';
    }
    return validatedFilters as AnalyticsFilters;
  }, []);

  const fetchData = useCallback(async (filters: AnalyticsFilters) => {
    setError(null);
    setLoading({ kpis: true, timeSeries: true, alerts: true, correlation: true });

    // 1. Desestructurar para obtener los nuevos filtros y los filtros base
    const { 
        sensorType, 
        secondarySensorTypes = [], 
        samplingFactor = 1, 
        ...baseRequestFilters 
    } = filters;

    // 2. **SOLUCIÓN ERROR 400**: Crear filtros minimalistas SÓLO con los campos que KPI/Alerts esperan
    const minimalFilters = {
        userId: baseRequestFilters.userId,
        tankId: baseRequestFilters.tankId,
        sensorId: baseRequestFilters.sensorId,
        range: baseRequestFilters.range,
        startDate: baseRequestFilters.startDate,
        endDate: baseRequestFilters.endDate,
    };
    // Validar y limpiar solo los filtros base
    const cleanedMinimalFilters = validateFilters(minimalFilters as AnalyticsFilters);
    
    const timeSeriesSensorType = sensorType || SensorType.TEMPERATURE; 
    const sensorTypesToFetch = [...new Set([timeSeriesSensorType, ...secondarySensorTypes])].filter(Boolean) as SensorType[];

    const correlationFilters: CorrelationFilters = { 
        ...(cleanedMinimalFilters as Omit<AnalyticsFilters, 'sensorType'>),
        sensorTypeX: SensorType.TEMPERATURE,
        sensorTypeY: SensorType.PH 
    };

    try {
      const promises = [
        analyticsService.getKpis(cleanedMinimalFilters), // <-- Usar filtros minimalistas
        analyticsService.getAlertsSummary(cleanedMinimalFilters), // <-- Usar filtros minimalistas
        analyticsService.getCorrelations(correlationFilters),
      ];

      const timeSeriesPromises = sensorTypesToFetch.map(type => 
        // Para series de tiempo, agregamos el sensorType específico a la base
        analyticsService.getTimeSeries({ ...cleanedMinimalFilters, sensorType: type }) 
      );
      
      const [kpisResult, summaryResult, corrResult, ...timeSeriesResults] = await Promise.allSettled([
        ...promises,
        ...timeSeriesPromises,
      ]);

      // Consolidación y Muestreo de Series de Tiempo
      let mergedTimeSeriesData: MultiTimeSeriesData[] = [];
      const fulfilledTSResults = timeSeriesResults
        .map((r, index) => ({
            result: r,
            type: sensorTypesToFetch[index]
        }))
        .filter(r => r.result.status === 'fulfilled' && r.result.value.length > 0)
        .map(r => ({ data: r.result.value as SingleTimeSeriesData[], type: r.type }));
      
      if (fulfilledTSResults.length > 0) {
        const baseData = fulfilledTSResults.find(r => r.type === sensorType)?.data || fulfilledTSResults[0].data;
        
        mergedTimeSeriesData = baseData.map((baseItem: SingleTimeSeriesData) => {
            const mergedItem: MultiTimeSeriesData = { timestamp: baseItem.timestamp };

            fulfilledTSResults.forEach(({ data: tsData, type }) => {
                const match = tsData.find((item: SingleTimeSeriesData) => item.timestamp === baseItem.timestamp);
                mergedItem[type] = match ? match.value : null; 
            });
            return mergedItem;
        }).filter((item: MultiTimeSeriesData) => Object.keys(item).length > 1);
        
        const sampledData = sampleData(mergedTimeSeriesData, samplingFactor);
        setTimeSeriesData(sampledData);

      } else {
        setTimeSeriesData([]); 
      }
      
      // Manejo de resultados
      if (kpisResult.status === 'fulfilled') setKpis(kpisResult.value);
      else { console.error('❌ Error KPIs:', kpisResult.reason); setKpis(null); }

      if (summaryResult.status === 'fulfilled') setAlertsSummary(summaryResult.value);
      else { console.error('❌ Error AlertsSummary:', summaryResult.reason); setAlertsSummary(null); }

      if (corrResult.status === 'fulfilled') setCorrelationData(corrResult.value);
      else { console.error('❌ Error Correlations:', corrResult.reason); setCorrelationData([]); }


    } catch (err: any) {
      console.error('💥 [useAnalytics] Error general:', err);
      setError(err.response?.data?.message || 'No se pudieron cargar todos los datos de analíticas.');
    } finally {
      setLoading({ kpis: false, timeSeries: false, alerts: false, correlation: false });
    }
  }, [validateFilters]);

  const resetState = useCallback(() => {
    setKpis(null);
    setTimeSeriesData([]);
    setAlertsSummary(null);
    setCorrelationData([]);
    setError(null);
    setLoading({ kpis: false, timeSeries: false, alerts: false, correlation: false });
  }, []);

  return { kpis, timeSeriesData, alertsSummary, correlationData, loading, error, fetchData, resetState };
};