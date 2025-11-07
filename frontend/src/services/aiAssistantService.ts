/**
 * @file aiAssistantService.ts
 * @route frontend/src/services
 * @description 
 * @author kevin mariano
 * @version 1.0.1 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import api from '@/config/api';
import { ApiResponse } from '@/types';

const AI_BASE_URL = '/asistente';

/**
 * @description Servicios para la interacción con el Asistente de IA (ACUAGENIUS).
 */
export const aiAssistantService = {
  /**
   * Envía una pregunta al asistente y espera una respuesta en texto natural.
   * @param query El texto de la pregunta del usuario.
   * @returns La respuesta de texto del asistente.
   */
  async getAIResponse(query: string): Promise<string> {
    try {
      // Llama a POST /api/asistente, donde su controlador está mapeado
      const response = await api.post<ApiResponse<string>>(`${AI_BASE_URL}`, {
        pregunta: query,
      });
      // La respuesta de su backend debe venir en response.data.data
      return response.data.data || 'Lo siento, no pude obtener una respuesta de la IA.';
    } catch (error) {
      console.error('Error al obtener respuesta de la IA:', error);
      throw new Error('Error de comunicación con el asistente de IA.');
    }
  },
};

export default aiAssistantService;