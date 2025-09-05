/**
 * @file useAnalytics.ts
 * @route frontend/src/hooks/
 * @description Hook personalizado para manejar la lógica de la página de analíticas.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  getKpis,
  getTimeSeries,
  getAlertsSummary,
  getCorrelations,
} from '@/services/analyticsService';

export const useAnalytics = () => {
  const [loading, setLoading] = useState({
    kpis: false,
    timeSeries: false,
    alerts: false,
    correlation: false,
  });
  const [kpis, setKpis] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [alertsSummary, setAlertsSummary] = useState(null);
  const [correlationData, setCorrelationData] = useState([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * @function fetchData
   * @description Función principal para obtener todos los datos de analíticas basado en los filtros.
   * @param {any} filters - Filtros para las consultas.
   */
  const fetchData = useCallback(async (filters: any) => {
    setError(null);

    // Fetch KPIs, Time Series y Alertas (basado en el parámetro principal)
    if (filters.sensorType) {
      setLoading((prev) => ({ ...prev, kpis: true, timeSeries: true, alerts: true }));
      try {
        const [kpisData, timeSeries, alertsData] = await Promise.all([
          getKpis(filters),
          getTimeSeries(filters),
          getAlertsSummary(filters),
        ]);
        setKpis(kpisData);
        setTimeSeriesData(timeSeries);
        setAlertsSummary(alertsData);
      } catch (err: any) {
        toast.error('Error al cargar datos principales de análisis.');
        setError('Error al cargar datos principales de análisis.');
      } finally {
        setLoading((prev) => ({ ...prev, kpis: false, timeSeries: false, alerts: false }));
      }
    }

    // Fetch Correlación (basado en los dos parámetros de correlación)
    if (filters.sensorTypeX && filters.sensorTypeY) {
        setLoading(prev => ({ ...prev, correlation: true }));
        try {
            const corrData = await getCorrelations(filters);
            setCorrelationData(corrData);
        } catch (err: any) {
            toast.error('Error al cargar datos de correlación.');
            setError('Error al cargar datos de correlación.');
        } finally {
            setLoading(prev => ({ ...prev, correlation: false }));
        }
    }
  }, []);

  return { loading, kpis, timeSeriesData, alertsSummary, correlationData, error, fetchData };
};