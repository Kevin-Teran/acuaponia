/**
 * @file predictionService.ts
 * @route frontend/src/services
 * @description Servicio para interactuar con la API de predicciones.
 * @author kevin mariano
 * @version 1.0.0
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

/**
 * @description Solicita al backend que genere una predicción y devuelve los resultados.
 * @param {GeneratePredictionPayload} payload - Parámetros para la generación.
 * @returns {Promise<any>} Los datos históricos y predichos.
 */
export const generatePrediction = async (payload: GeneratePredictionPayload) => {
  const { data } = await api.post('/predictions/generate', payload);
  return data;
};