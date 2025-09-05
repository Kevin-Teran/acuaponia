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

export const getKpis = async (filters: any) => {
  const { data } = await api.get('/analytics/kpis', { params: filters });
  return data;
};

export const getTimeSeries = async (filters: any) => {
  const { data } = await api.get('/analytics/time-series', { params: filters });
  return data;
};

export const getAlertsSummary = async (filters: any) => {
  const { data } = await api.get('/analytics/alerts-summary', { params: filters });
  return data;
};

export const getCorrelations = async (filters: any) => {
  const { data } = await api.get('/analytics/correlations', { params: filters });
  return data;
};

/**
 * @function getDataDateRange
 * @description Obtiene el primer y último punto de datos para el usuario actual.
 * @returns {Promise<{firstDataPoint: string | null}>}
 */
export const getDataDateRange = async () => {
  const { data } = await api.get('/analytics/data-range');
  return data;
};