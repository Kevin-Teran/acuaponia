/**
 * @file useAnalytics.ts
 * @route frontend/src/hooks/
 * @description Hook personalizado para manejar la lógica de la página de analíticas - VERSIÓN FINAL CORREGIDA.
 * @author kevin mariano
 * @version 1.0.10 // Exportación default
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import { useState, useCallback } from 'react';
import * as analyticsService from '@/services/analyticsService';
import aiAssistantService from '@/services/aiAssistantService'; 
import { Kpi, AlertSummary, CorrelationData, SensorType, Role } from '@/types'; 

interface SingleTimeSeriesData { timestamp: string; value: number; }
type MultiTimeSeriesData = {
  timestamp: string;
  [key: string]: number | string | null;
};

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
  correlationX?: SensorType; 
  correlationY?: SensorType; 
}

interface LoadingState {
  kpis: boolean;
  timeSeries: boolean;
  alerts: boolean;
  correlation: boolean;
  aiAnalysis: boolean;
}

interface CorrelationFilters extends Omit<AnalyticsFilters, 'sensorType'> {
  sensorTypeX: string;
  sensorTypeY: string;
}

const useAnalytics = () => {
  const [kpis, setKpis] = useState<Kpi | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<MultiTimeSeriesData[]>([]);
  const [alertsSummary, setAlertsSummary] = useState<AlertSummary | null>(null);
  const [correlationData, setCorrelationData] = useState<CorrelationData[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null); 
  
  const [loading, setLoading] = useState<LoadingState>({
    kpis: false,
    timeSeries: false,
    alerts: false,
    correlation: false,
    aiAnalysis: false, 
  });
  
  const [error, setError] = useState<string | null>(null);

  const validateFilters = useCallback((filters: AnalyticsFilters): AnalyticsFilters => {
    const validatedFilters: Partial<AnalyticsFilters> = {};
    for (const key in filters) {
        const value = filters[key as keyof AnalyticsFilters];
        
        if (Array.isArray(value) || typeof value === 'number' || key === 'correlationX' || key === 'correlationY') {
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
    setLoading(prev => ({ ...prev, kpis: true, timeSeries: true, alerts: true, correlation: true, aiAnalysis: true }));

    const { 
        sensorType, 
        secondarySensorTypes = [], 
        samplingFactor = 1, 
        correlationX, 
        correlationY, 
        ...baseRequestFilters 
    } = filters;

    const minimalFilters = {
        userId: baseRequestFilters.userId,
        tankId: baseRequestFilters.tankId,
        sensorId: baseRequestFilters.sensorId,
        range: baseRequestFilters.range,
        startDate: baseRequestFilters.startDate,
        endDate: baseRequestFilters.endDate,
    };
    
    const cleanedMinimalFilters = validateFilters(minimalFilters as AnalyticsFilters);
    
    const corrX = correlationX || SensorType.TEMPERATURE;
    const corrY = correlationY || SensorType.PH;

    const timeSeriesSensorType = sensorType || SensorType.TEMPERATURE; 
    const sensorTypesToFetch = [...new Set([timeSeriesSensorType, ...secondarySensorTypes])].filter(Boolean) as SensorType[];

    const correlationFilters: CorrelationFilters = { 
        ...(cleanedMinimalFilters as Omit<AnalyticsFilters, 'sensorType'>),
        sensorTypeX: corrX, 
        sensorTypeY: corrY, 
    };

    const timeSeriesBaseFilters = {
        ...cleanedMinimalFilters,
        samplingFactor: samplingFactor, 
    };
    
    const aiPrompt = `Genera un resumen de analíticas y tendencias para el sistema de Acuaponía. Tipo de sensor principal: ${timeSeriesSensorType}. Filtros de tiempo: ${cleanedMinimalFilters.range || cleanedMinimalFilters.startDate} a ${cleanedMinimalFilters.endDate}. Tanque: ${cleanedMinimalFilters.tankId || 'Todos'}. Céntrate en la interpretación de los datos (promedio, min, max, alertas) y la correlación.`;


    try {
      const promises = [
        analyticsService.getKpis(cleanedMinimalFilters),
        analyticsService.getAlertsSummary(cleanedMinimalFilters),
        analyticsService.getCorrelations(correlationFilters),
        aiAssistantService.getAIResponse(aiPrompt),
      ];

      const timeSeriesPromises = sensorTypesToFetch.map(type => 
        analyticsService.getTimeSeries({ ...timeSeriesBaseFilters, sensorType: type }) 
      );
      
      const [kpisResult, summaryResult, corrResult, aiResult, ...timeSeriesResults] = await Promise.allSettled([
        ...promises,
        ...timeSeriesPromises,
      ]);

      // --- Consolidación de Series de Tiempo (Se mantiene el código original) ---
      let mergedTimeSeriesData: MultiTimeSeriesData[] = [];
      
      const resultsWithTypes = timeSeriesResults.map((result, index) => ({
          result,
          type: sensorTypesToFetch[index] as SensorType, 
      }));

      const fulfilledTSResults = resultsWithTypes
        .filter((r): r is { result: PromiseFulfilledResult<SingleTimeSeriesData[]>, type: SensorType } => 
            r.result.status === 'fulfilled' && (r.result.value as SingleTimeSeriesData[]).length > 0
        )
        .map(r => ({ data: r.result.value, type: r.type }));
      
      if (fulfilledTSResults.length > 0) {
        
        const allTimestamps = new Set(fulfilledTSResults.flatMap(r => r.data.map(d => d.timestamp)));
        
        mergedTimeSeriesData = Array.from(allTimestamps).sort().map(timestamp => {
            const mergedItem: MultiTimeSeriesData = { timestamp };

            fulfilledTSResults.forEach(({ data: tsData, type }) => {
                const match = tsData.find((item: SingleTimeSeriesData) => item.timestamp === timestamp);
                mergedItem[type] = match ? match.value : null; 
            });
            return mergedItem;
        }).filter((item: MultiTimeSeriesData) => Object.keys(item).length > 1);
        
        setTimeSeriesData(mergedTimeSeriesData);

      } else {
        setTimeSeriesData([]); 
      }
      // -----------------------------------------------------------------
      
      // --- Manejo de resultados (Extracción de .data) ---
      if (kpisResult.status === 'fulfilled') setKpis(kpisResult.value.data as Kpi); 
      else { console.error('❌ Error KPIs:', kpisResult.reason); setKpis(null); }

      if (summaryResult.status === 'fulfilled') setAlertsSummary(summaryResult.value.data as AlertSummary); 
      else { console.error('❌ Error AlertsSummary:', summaryResult.reason); setAlertsSummary(null); }

      if (corrResult.status === 'fulfilled') setCorrelationData(corrResult.value.data as CorrelationData[]); 
      else { console.error('❌ Error Correlations:', corrResult.reason); setCorrelationData([]); }

      if (aiResult.status === 'fulfilled') setAiAnalysis(aiResult.value as string);
      else { 
          console.error('❌ Error AI Analysis:', aiResult.reason); 
          setAiAnalysis('No se pudo generar un análisis automático. Intenta más tarde.'); 
      }
      // -----------------------------------------------------------------


    } catch (err: any) {
      console.error('💥 [useAnalytics] Error general:', err);
      setError(err.message || 'No se pudieron cargar todos los datos de analíticas.');
    } finally {
      setLoading(prev => ({ ...prev, timeSeries: false, kpis: false, alerts: false, correlation: false, aiAnalysis: false }));
    }
  }, [validateFilters]);

  const resetState = useCallback(() => {
    setKpis(null);
    setTimeSeriesData([]);
    setAlertsSummary(null);
    setCorrelationData([]);
    setAiAnalysis(null); 
    setLoading({ kpis: false, timeSeries: false, alerts: false, correlation: false, aiAnalysis: false });
  }, []);

  return { kpis, timeSeriesData, alertsSummary, correlationData, aiAnalysis, loading, error, fetchData, resetState };
};

export default useAnalytics; // 🎯 Cambio a exportación por defecto