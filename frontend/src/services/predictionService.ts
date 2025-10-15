/**
 * @file predictionService.ts
 * @route frontend/src/services
 * @description Servicio mejorado para interactuar con la API de predicciones
 * @author Kevin Mariano
 * @version 2.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import api from '@/config/api';
import { SensorType } from '@/types';

export interface GeneratePredictionPayload {
  tankId: string;
  type: SensorType;
  horizon: number;
}

export interface PredictionResponse {
  predicted: Array<{
    timestamp: string;
    value: number;
  }>;
  historical: Array<{
    id: string;
    value: number;
    timestamp: string;
    type: string;
  }>;
  thresholds: {
    minCritical: number;
    maxCritical: number;
    minWarning: number;
    maxWarning: number;
  } | null;
  message?: string;
}

/**
 * @description Solicita al backend que genere una predicción
 * @param {GeneratePredictionPayload} payload - Parámetros para la generación
 * @returns {Promise<PredictionResponse>} Los datos históricos y predichos
 */
export const generatePrediction = async (
  payload: GeneratePredictionPayload
): Promise<PredictionResponse> => {
  try {
    //console.log('🔮 Generando predicción:', payload);
    
    const { data } = await api.post('/predictions/generate', payload);
    
    /**
     * console.log('✅ Predicción recibida:', {
     *   historicalPoints: data.historical?.length || 0,
     *   predictedPoints: data.predicted?.length || 0,
     *   hasThresholds: !!data.thresholds
     * });
    */
    return data;
  } catch (error: any) {
    console.error('❌ Error generando predicción:', error);
    
    // Manejar errores específicos
    if (error.response?.status === 404) {
      throw new Error('No se encontraron datos para generar la predicción');
    }
    if (error.response?.status === 400) {
      throw new Error('Parámetros inválidos para la predicción');
    }
    
    throw new Error('Error al generar la predicción');
  }
};

/**
 * @description Obtiene el historial de predicciones de un tanque
 * @param {string} tankId - ID del tanque
 * @returns {Promise<any[]>} Historial de predicciones
 */
export const getPredictionHistory = async (tankId: string): Promise<any[]> => {
  try {
    const { data } = await api.get(`/predictions/history/${tankId}`);
    return data;
  } catch (error) {
    console.error('Error obteniendo historial de predicciones:', error);
    return [];
  }
};

/**
 * @description Compara predicciones con valores reales
 * @param {string} tankId - ID del tanque
 * @param {string} startDate - Fecha de inicio
 * @param {string} endDate - Fecha de fin
 * @returns {Promise<any>} Análisis de precisión
 */
export const analyzePredictionAccuracy = async (
  tankId: string,
  startDate: string,
  endDate: string
): Promise<any> => {
  try {
    const { data } = await api.get(`/predictions/accuracy/${tankId}`, {
      params: { startDate, endDate }
    });
    return data;
  } catch (error) {
    console.error('Error analizando precisión:', error);
    return null;
  }
};