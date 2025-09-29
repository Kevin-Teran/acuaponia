/**
 * @file dashboardService.ts
 * @route frontend/src/services
 * @description Funciones para interactuar con los endpoints del dashboard en el backend.
 * @author Kevin Mariano
 * @version 1.0.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import api from '@/config/api';
import { UserFromApi } from '@/types';
import { RealtimeData, HistoricalData, DashboardFilters, DashboardSummary } from '@/types/dashboard';

/**
 * @function cleanFilters
 * @description Limpia un objeto de filtros eliminando propiedades con valores 'undefined' o 'null'.
 * @param {DashboardFilters} filters - El objeto de filtros original.
 * @returns {Record<string, string>}
 */
const cleanFilters = (filters: DashboardFilters): Record<string, string> => {
    return Object.entries(filters).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
            acc[key] = value.toString();
        }
        return acc;
    }, {} as Record<string, string>);
};

/**
 * @function getSummary
 * @description Obtiene el resumen de estadísticas del dashboard desde el backend.
 * @param {DashboardFilters} filters - Filtros para la consulta.
 * @returns {Promise<DashboardSummary>} // CORRECCIÓN CLAVE
 */
export const getSummary = async (
    filters: DashboardFilters,
): Promise<DashboardSummary> => {
    const defaultRange = 'week' as const; 
    const effectiveFilters: DashboardFilters = {
        ...filters,
        range: filters.range ?? defaultRange,
    }; 
    const cleanedFilters = cleanFilters(effectiveFilters);
    const { data } = await api.get('/dashboard/summary', { params: cleanedFilters });
    return data;
};

/**
 * @function getRealtimeData
 * @description Obtiene los datos en tiempo real de los sensores.
 * @param {DashboardFilters} filters - Filtros para la consulta.
 * @returns {Promise<RealtimeData>}
 */
export const getRealtimeData = async (
    filters: DashboardFilters,
): Promise<RealtimeData> => {
    const defaultRange = 'week' as const; 
    const effectiveFilters: DashboardFilters = {
        ...filters,
        range: filters.range ?? defaultRange,
    };
    const cleanedFilters = cleanFilters(effectiveFilters);
    const { data } = await api.get('/dashboard/realtime', { params: cleanedFilters });
    return data;
};

/**
 * @function getHistoricalData
 * @description Obtiene los datos históricos para los gráficos.
 * @param {DashboardFilters} filters - Filtros para la consulta.
 * @returns {Promise<HistoricalData>}
 */
export const getHistoricalData = async (
    filters: DashboardFilters,
): Promise<HistoricalData> => {
    const defaultRange = 'week' as const;
    const effectiveFilters: DashboardFilters = {
        ...filters,
        range: filters.range ?? defaultRange,
    };
    const cleanedFilters = cleanFilters(effectiveFilters);
    const { data } = await api.get('/dashboard/historical', {
        params: cleanedFilters,
    });
    return data;
};

/**
 * @function getUsersListForAdmin
 * @description Obtiene la lista de usuarios (solo para administradores).
 * @returns {Promise<UserFromApi[]>} 
 */
export const getUsersListForAdmin = async (): Promise<UserFromApi[]> => {
    const { data } = await api.get('/dashboard/users');
    return data;
};