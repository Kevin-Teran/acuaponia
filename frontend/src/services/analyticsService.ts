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
 * @function getKpis
 * @description Obtiene los KPIs desde el backend.
 * @param {any} filters - Filtros para la consulta de KPIs.
 * @returns {Promise<any>} Los datos de los KPIs.
 */
export const getKpis = async (filters: any) => {
  const { data } = await api.get('/analytics/kpis', { params: filters });
  return data;
};

/**
 * @function getTimeSeries
 * @description Obtiene los datos para series de tiempo.
 * @param {any} filters - Filtros para la consulta.
 * @returns {Promise<any>} Los datos para la serie de tiempo.
 */
export const getTimeSeries = async (filters: any) => {
  const { data } = await api.get('/analytics/time-series', { params: filters });
  return data;
};

/**
 * @function getAlertsSummary
 * @description Obtiene el resumen de alertas.
 * @param {any} filters - Filtros para la consulta.
 * @returns {Promise<any>} El resumen de alertas.
 */
export const getAlertsSummary = async (filters: any) => {
  const { data } = await api.get('/analytics/alerts-summary', { params: filters });
  return data;
};

/**
 * @function getCorrelations
 * @description Obtiene los datos de correlación entre dos sensores.
 * @param {any} filters - Filtros para la consulta.
 * @returns {Promise<any>} Los datos para el gráfico de dispersión.
 */
export const getCorrelations = async (filters: any) => {
  const { data } = await api.get('/analytics/correlations', { params: filters });
  return data;
};