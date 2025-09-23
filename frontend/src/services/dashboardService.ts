/**
 * @file dashboardService.ts
 * @description Funciones para interactuar con los endpoints del dashboard en el backend.
 * SOLUCIÓN: Define y exporta las funciones que el hook `useDashboard` necesita,
 * corrigiendo los errores 'is not a function'.
 * @author Kevin Mariano & Gemini AI
 * @version 2.0.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import api from '@/config/api';
import {
	SummaryData,
	RealtimeData,
	HistoricalData,
	UserForList,
} from '@/types';
import { DashboardFiltersDto } from '@/types/dashboard';

/**
 * @function getSummary
 * @description Obtiene el resumen de estadísticas del dashboard desde el backend.
 * @param {DashboardFiltersDto} filters - Filtros para la consulta.
 * @returns {Promise<SummaryData>}
 */
export const getSummary = async (
	filters: DashboardFiltersDto,
): Promise<SummaryData> => {
	const { data } = await api.get('/dashboard/summary', { params: filters });
	return data;
};

/**
 * @function getRealtimeData
 * @description Obtiene los datos en tiempo real de los sensores.
 * @param {DashboardFiltersDto} filters - Filtros para la consulta.
 * @returns {Promise<RealtimeData>}
 */
export const getRealtimeData = async (
	filters: DashboardFiltersDto,
): Promise<RealtimeData> => {
	const { data } = await api.get('/dashboard/realtime', { params: filters });
	return data;
};

/**
 * @function getHistoricalData
 * @description Obtiene los datos históricos para los gráficos.
 * @param {DashboardFiltersDto} filters - Filtros para la consulta.
 * @returns {Promise<HistoricalData>}
 */
export const getHistoricalData = async (
	filters: DashboardFiltersDto,
): Promise<HistoricalData> => {
	const { data } = await api.get('/dashboard/historical', {
		params: filters,
	});
	return data;
};

/**
 * @function getUsersListForAdmin
 * @description Obtiene la lista de usuarios (solo para administradores).
 * @returns {Promise<UserForList[]>}
 */
export const getUsersListForAdmin = async (): Promise<UserForList[]> => {
	const { data } = await api.get('/dashboard/users');
	return data;
};
