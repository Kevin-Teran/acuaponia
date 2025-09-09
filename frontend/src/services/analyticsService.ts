/**
 * @file analyticsService.ts
 * @route frontend/src/services/
 * @description Servicio para interactuar con el módulo de analíticas del backend - SOLUCIÓN FINAL.
 * @author kevin mariano
 * @version 2.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import api from '@/config/api';
import { SensorType } from '@/types';

/**
 * @interface AnalyticsFilters
 * @description Interfaz para los filtros de analíticas
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
 * @description Interfaz para los filtros de correlación
 */
interface CorrelationFilters extends Omit<AnalyticsFilters, 'sensorType'> {
  sensorTypeX?: string;
  sensorTypeY?: string;
}

/**
 * @interface DataRangeParams
 * @description Parámetros para obtener el rango de datos
 */
interface DataRangeParams {
  userId?: string;
}

/**
 * @function cleanFilters
 * @description Limpia y valida los filtros antes de enviarlos como parámetros de URL.
 * @private
 * @param {object} filters - Filtros a limpiar
 * @returns {object} Filtros limpiados
 */
const cleanFilters = (filters: any): Record<string, string> => {
  const cleaned: Record<string, string> = {};

  Object.keys(filters).forEach(key => {
    const value = filters[key];
    if (value !== undefined && value !== null && value !== '' && value !== 'ALL') {
      cleaned[key] = String(value);
    }
  });

  return cleaned;
};

/**
 * @function getKpis
 * @description Obtiene las métricas KPI basadas en los filtros proporcionados.
 * @param {AnalyticsFilters} filters - Filtros para la consulta
 * @returns {Promise<any>} Datos de KPI
 */
export const getKpis = async (filters: AnalyticsFilters) => {
  try {
    const cleanedFilters = cleanFilters(filters);
    const { data } = await api.get('/analytics/kpis', { params: cleanedFilters });
    return data;
  } catch (error: any) {
    console.error('❌ [Analytics] Error obteniendo KPIs:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * @function getTimeSeries
 * @description Obtiene los datos de series temporales.
 * @param {AnalyticsFilters} filters - Filtros para la consulta
 * @returns {Promise<any>} Datos de series temporales
 */
export const getTimeSeries = async (filters: AnalyticsFilters) => {
  try {
    const cleanedFilters = cleanFilters(filters);
    const { data } = await api.get('/analytics/time-series', { params: cleanedFilters });
    return data;
  } catch (error: any) {
    console.error('❌ [Analytics] Error obteniendo series temporales:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * @function getAlertsSummary
 * @description Obtiene el resumen de alertas agrupadas.
 * @param {AnalyticsFilters} filters - Filtros para la consulta
 * @returns {Promise<any>} Resumen de alertas
 */
export const getAlertsSummary = async (filters: AnalyticsFilters) => {
  try {
    const cleanedFilters = cleanFilters(filters);
    const { data } = await api.get('/analytics/alerts-summary', { params: cleanedFilters });
    return data;
  } catch (error: any) {
    console.error('❌ [Analytics] Error obteniendo resumen de alertas:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * @function getCorrelations
 * @description Obtiene los datos de correlación entre sensores.
 * @param {CorrelationFilters} filters - Filtros para la correlación
 * @returns {Promise<any>} Datos de correlación
 */
export const getCorrelations = async (filters: CorrelationFilters) => {
  try {
    console.log('🔗 [Analytics] Iniciando getCorrelations con filtros:', filters);

    const filtersWithDefaults = {
      ...filters,
      sensorTypeX: filters.sensorTypeX || SensorType.TEMPERATURE,
      sensorTypeY: filters.sensorTypeY || SensorType.PH,
    };
    
    if (filtersWithDefaults.sensorTypeX === filtersWithDefaults.sensorTypeY) {
        console.warn('Los tipos de sensor para correlación deben ser diferentes. Se retorna un array vacío.');
        return [];
    }

    const cleanedFilters = cleanFilters(filtersWithDefaults);
    
    console.log('🧹 [Analytics] Filtros de correlación FINALES enviados a la API:', cleanedFilters);

    const { data } = await api.get('/analytics/correlations', { params: cleanedFilters });
    console.log(`✅ [Analytics] Correlaciones obtenidas: ${data.length} puntos`);
    return data;
  } catch (error: any) {
    console.error('❌ [Analytics] Error obteniendo correlaciones:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * @function getDataDateRange
 * @description Obtiene el primer y último punto de datos para el usuario especificado.
 * @param {DataRangeParams} params - Parámetros con el ID del usuario
 * @returns {Promise<{firstDataPoint: string | null, lastDataPoint: string | null}>}
 */
export const getDataDateRange = async (params: DataRangeParams = {}) => {
  try {
    const cleanedParams = cleanFilters(params);
    const { data } = await api.get('/analytics/data-range', { params: cleanedParams });
    return data;
  } catch (error: any) {
    console.error('❌ [Analytics] Error obteniendo rango de datos:', error.response?.data || error.message);
    throw error;
  }
};