/**
 * @file analyticsService.ts
 * @route frontend/src/services/
 * @description Servicio para interactuar con el módulo de analíticas del backend.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import api from '@/config/api';

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
interface CorrelationFilters extends AnalyticsFilters {
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
 * @function getKpis
 * @description Obtiene las métricas KPI basadas en los filtros proporcionados.
 * @param {AnalyticsFilters} filters - Filtros para la consulta
 * @returns {Promise<any>} Datos de KPI
 */
export const getKpis = async (filters: AnalyticsFilters) => {
  const { data } = await api.get('/analytics/kpis', { params: filters });
  return data;
};

/**
 * @function getTimeSeries
 * @description Obtiene los datos de series temporales.
 * @param {AnalyticsFilters} filters - Filtros para la consulta
 * @returns {Promise<any>} Datos de series temporales
 */
export const getTimeSeries = async (filters: AnalyticsFilters) => {
  const { data } = await api.get('/analytics/time-series', { params: filters });
  return data;
};

/**
 * @function getAlertsSummary
 * @description Obtiene el resumen de alertas agrupadas.
 * @param {AnalyticsFilters} filters - Filtros para la consulta
 * @returns {Promise<any>} Resumen de alertas
 */
export const getAlertsSummary = async (filters: AnalyticsFilters) => {
  const { data } = await api.get('/analytics/alerts-summary', { params: filters });
  return data;
};

/**
 * @function getCorrelations
 * @description Obtiene los datos de correlación entre sensores.
 * @param {CorrelationFilters} filters - Filtros para la correlación
 * @returns {Promise<any>} Datos de correlación
 */
export const getCorrelations = async (filters: CorrelationFilters) => {
  try {
    console.log('Enviando filtros a correlations:', filters);
    const { data } = await api.get('/analytics/correlations', { params: filters });
    console.log('Respuesta de correlations:', data);
    return data;
  } catch (error) {
    console.error('Error en getCorrelations:', error);
    // Log del detalle del error para debugging
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
    }
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
  const { data } = await api.get('/analytics/data-range', { params });
  return data;
};