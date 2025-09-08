/**
 * @file analyticsService.ts
 * @route frontend/src/services/
 * @description Servicio para interactuar con el módulo de analíticas del backend - SOLUCIÓN FINAL.
 * @author kevin mariano
 * @version 1.0.0
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
 * @function cleanFilters
 * @description Limpia y valida los filtros antes de enviarlos a la API.
 * @private
 * @param {object} filters - Filtros a limpiar
 * @returns {object} Filtros limpiados
 */
const cleanFilters = (filters: any): any => {
  const cleaned: any = {};

  // Solo agregar valores que no sean undefined, null, string vacío o 'ALL'
  Object.keys(filters).forEach(key => {
    const value = filters[key];
    
    // Excluir valores no válidos
    if (
      value === undefined || 
      value === null || 
      value === '' || 
      value === 'undefined' || 
      value === 'null' ||
      value === 'ALL'
    ) {
      return; // No agregar este campo
    }
    
    cleaned[key] = value;
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
    console.log('📊 [Analytics] Enviando filtros KPI:', filters);
    
    const cleanedFilters = cleanFilters(filters);
    console.log('🧹 [Analytics] Filtros KPI limpiados:', cleanedFilters);
    
    const { data } = await api.get('/analytics/kpis', { params: cleanedFilters });
    console.log('✅ [Analytics] KPIs obtenidos exitosamente');
    
    return data;
  } catch (error: any) {
    console.error('❌ [Analytics] Error obteniendo KPIs:', error);
    console.error('📄 [Analytics] Detalle del error KPIs:', error.response?.data);
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
    console.log('📈 [Analytics] Enviando filtros TimeSeries:', filters);
    
    const cleanedFilters = cleanFilters(filters);
    console.log('🧹 [Analytics] Filtros TimeSeries limpiados:', cleanedFilters);
    
    const { data } = await api.get('/analytics/time-series', { params: cleanedFilters });
    console.log('✅ [Analytics] Series temporales obtenidas exitosamente:', data.length);
    
    return data;
  } catch (error: any) {
    console.error('❌ [Analytics] Error obteniendo series temporales:', error);
    console.error('📄 [Analytics] Detalle del error TimeSeries:', error.response?.data);
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
    console.log('🚨 [Analytics] Enviando filtros AlertsSummary:', filters);
    
    const cleanedFilters = cleanFilters(filters);
    console.log('🧹 [Analytics] Filtros AlertsSummary limpiados:', cleanedFilters);
    
    const { data } = await api.get('/analytics/alerts-summary', { params: cleanedFilters });
    console.log('✅ [Analytics] Resumen de alertas obtenido exitosamente');
    
    return data;
  } catch (error: any) {
    console.error('❌ [Analytics] Error obteniendo resumen de alertas:', error);
    console.error('📄 [Analytics] Detalle del error AlertsSummary:', error.response?.data);
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
    
    // 🔧 Establecer valores por defecto explícitamente
    const filtersWithDefaults: CorrelationFilters = {
      ...filters,
      sensorTypeX: filters.sensorTypeX || SensorType.TEMPERATURE,
      sensorTypeY: filters.sensorTypeY || SensorType.PH,
      range: filters.range || 'week',
    };
    
    console.log('🔧 [Analytics] Filtros con valores por defecto:', filtersWithDefaults);
    
    // Validación adicional en frontend
    if (filtersWithDefaults.sensorTypeX === filtersWithDefaults.sensorTypeY) {
      throw new Error('Los tipos de sensor para correlación deben ser diferentes');
    }
    
    // 🔧 Limpieza especial para correlaciones
    const cleanedFilters = cleanFilters(filtersWithDefaults);
    
    // 🔧 Asegurar que los tipos de sensor estén presentes después de la limpieza
    if (!cleanedFilters.sensorTypeX) {
      cleanedFilters.sensorTypeX = SensorType.TEMPERATURE;
    }
    if (!cleanedFilters.sensorTypeY) {
      cleanedFilters.sensorTypeY = SensorType.PH;
    }
    
    console.log('🧹 [Analytics] Filtros Correlations FINALES:', cleanedFilters);
    
    // 🔧 Construir URL manualmente para debugging
    const baseUrl = '/analytics/correlations';
    const queryParams = new URLSearchParams();
    
    Object.entries(cleanedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
    
    const fullUrl = `${baseUrl}?${queryParams.toString()}`;
    console.log('🌐 [Analytics] URL completa:', fullUrl);
    
    const { data } = await api.get(baseUrl, { params: cleanedFilters });
    console.log('✅ [Analytics] Correlaciones obtenidas exitosamente:', data.length, 'puntos');
    
    return data;
  } catch (error: any) {
    console.error('❌ [Analytics] Error obteniendo correlaciones:', error);
    console.error('📄 [Analytics] Response status:', error.response?.status);
    console.error('📄 [Analytics] Response headers:', error.response?.headers);
    console.error('📄 [Analytics] Response data:', error.response?.data);
    console.error('📄 [Analytics] Request config:', error.config);
    
    // Log más detallado para debugging
    if (error.response?.data?.message) {
      console.error('📄 [Analytics] Mensaje de error del servidor:', error.response.data.message);
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
  try {
    console.log('📅 [Analytics] Solicitando rango de datos:', params);
    
    const cleanedParams = cleanFilters(params);
    console.log('🧹 [Analytics] Parámetros rango limpiados:', cleanedParams);
    
    const { data } = await api.get('/analytics/data-range', { params: cleanedParams });
    console.log('✅ [Analytics] Rango de datos obtenido exitosamente');
    
    return data;
  } catch (error: any) {
    console.error('❌ [Analytics] Error obteniendo rango de datos:', error);
    console.error('📄 [Analytics] Detalle del error DataRange:', error.response?.data);
    throw error;
  }
};