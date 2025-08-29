/**
 * @file useDashboard.ts
 * @description Hook para manejar la lógica de obtención de datos del dashboard.
 * @author kevin mariano
 * @version 1.1.0
 */
import { useState, useCallback } from 'react';
import { getDashboardData } from '../services/dashboardService';
import { DashboardData } from '../types';

interface Filters {
  userId?: number;
  tankId?: string;
  startDate?: string;
  endDate?: string;
}

export const useDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (filters: Filters) => {
    // No procesar si faltan filtros esenciales como el tanque
    if (!filters.tankId) {
        setData(null); // Limpiar datos si no hay tanque seleccionado
        setLoading(false);
        return;
    }

    setLoading(true);
    setError(null);
    try {
      const formattedFilters = {
        ...filters,
        ...(filters.startDate && { startDate: new Date(filters.startDate).toISOString().split('T')[0] }),
        ...(filters.endDate && { endDate: new Date(filters.endDate).toISOString().split('T')[0] }),
      };
      const result = await getDashboardData(formattedFilters);
      setData(result);
    } catch (err) {
      setError('Error al cargar los datos del dashboard.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchData };
};