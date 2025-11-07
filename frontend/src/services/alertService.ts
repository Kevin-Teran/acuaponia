/**
 * @file alertService.ts
 * @route frontend/src/services
 * @description Servicios para la gestión de alertas, incluyendo consulta y resolución.
 * @author kevin mariano
 * @version 1.0.1 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import api from '@/config/api';
import { Alert, ApiResponse } from '@/types';

const ALERTS_BASE_URL = '/alerts';

/**
 * @description Servicios para la gestión de alertas del sistema.
 */
export const alertsService = {
  /**
   * Obtiene todas las alertas no resueltas para el usuario actual.
   */
  async getUnresolvedAlerts(): Promise<Alert[]> {
    try {
      const response = await api.get<ApiResponse<Alert[]>>(`${ALERTS_BASE_URL}/unresolved`); 
      return response.data.data || []; 
    } catch (error) {
      console.error('Error al obtener alertas no resueltas:', error);
      throw error; 
    }
  },

  /**
   * Marca una alerta específica como resuelta.
   */
  async resolveAlert(alertId: string): Promise<void> {
    try {
      await api.patch(`${ALERTS_BASE_URL}/${alertId}/resolve`); 
    } catch (error) {
      console.error(`Error al resolver la alerta ${alertId}:`, error);
      throw error;
    }
  },
};

export default alertsService;