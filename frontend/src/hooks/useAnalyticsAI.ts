/**
 * @file useAnalyticsAI.ts
 * @route frontend/src/hooks/
 * @description Hook para integración de AI Assistant con contexto de analíticas
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { useState, useCallback } from 'react';
import aiAssistantService from '@/services/aiAssistantService';
import { SensorType } from '@/types';

interface AnalyticsContext {
  tankId: string;
  tankName?: string;
  sensorType?: SensorType;
  dateRange: { from: Date; to: Date };
  kpis?: {
    average?: number | null;
    max?: number | null;
    min?: number | null;
    stdDev?: number | null;
    count?: number;
  };
}

/**
 * @function useAnalyticsAI
 * @description Hook para realizar análisis de datos con IA contextual
 * @param context Contexto actual de analíticas
 * @returns Funciones y estado para análisis AI
 */
export const useAnalyticsAI = (context: AnalyticsContext) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  
  /**
   * @function buildContextPrompt
   * @description Construye un prompt enriquecido con el contexto actual
   */
  const buildContextPrompt = useCallback((userQuery?: string): string => {
    const { tankId, tankName, sensorType, dateRange, kpis } = context;
    
    const tankInfo = tankId === 'ALL' 
      ? 'Todos los tanques del sistema' 
      : tankName || `Tanque ${tankId}`;
    
    const dateStr = `${dateRange.from.toLocaleDateString('es-ES')} - ${dateRange.to.toLocaleDateString('es-ES')}`;
    
    let prompt = `Contexto del Sistema de Monitoreo Acuapónico:\n\n`;
    prompt += `📍 Alcance: ${tankInfo}\n`;
    
    if (sensorType) {
      prompt += `🌡️ Parámetro: ${sensorType}\n`;
    }
    
    prompt += `📅 Período: ${dateStr}\n\n`;
    
    if (kpis && kpis.count && kpis.count > 0) {
      prompt += `📊 Métricas Clave:\n`;
      if (kpis.average !== null) prompt += `- Promedio: ${kpis.average?.toFixed(2)}\n`;
      if (kpis.max !== null) prompt += `- Máximo: ${kpis.max?.toFixed(2)}\n`;
      if (kpis.min !== null) prompt += `- Mínimo: ${kpis.min?.toFixed(2)}\n`;
      if (kpis.stdDev !== null) prompt += `- Desviación Estándar: ${kpis.stdDev?.toFixed(2)}\n`;
      prompt += `- Total de Registros: ${kpis.count}\n\n`;
    }
    
    if (userQuery) {
      prompt += `Pregunta del Usuario: ${userQuery}\n\n`;
    } else {
      prompt += `Por favor, proporciona:\n`;
      prompt += `1. Un análisis general del estado del sistema\n`;
      prompt += `2. Identificación de tendencias o patrones\n`;
      prompt += `3. Alertas o anomalías detectadas\n`;
      prompt += `4. Recomendaciones específicas para mejorar\n`;
    }
    
    return prompt;
  }, [context]);
  
  /**
   * @function analyzeData
   * @description Envía una solicitud de análisis a la IA
   */
  const analyzeData = useCallback(async (userQuery?: string): Promise<string> => {
    setIsProcessing(true);
    
    try {
      const prompt = buildContextPrompt(userQuery);
      const analysis = await aiAssistantService.getAIResponse(prompt);
      
      setLastAnalysis(analysis);
      return analysis;
    } catch (error) {
      console.error('❌ [AnalyticsAI] Error en análisis:', error);
      throw new Error('No se pudo obtener el análisis de ACUAGENIUS. Intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  }, [buildContextPrompt]);
  
  /**
   * @function analyzeAnomaly
   * @description Análisis específico de anomalías
   */
  const analyzeAnomaly = useCallback(async (): Promise<string> => {
    const query = 'Analiza si hay valores anómalos, picos inesperados o tendencias preocupantes en los datos. Indica si requieren atención inmediata.';
    return analyzeData(query);
  }, [analyzeData]);
  
  /**
   * @function getRecommendations
   * @description Obtiene recomendaciones específicas
   */
  const getRecommendations = useCallback(async (): Promise<string> => {
    const query = 'Proporciona recomendaciones específicas y accionables para optimizar el sistema basándote en los datos actuales.';
    return analyzeData(query);
  }, [analyzeData]);
  
  /**
   * @function compareTrends
   * @description Compara tendencias actuales vs históricas
   */
  const compareTrends = useCallback(async (): Promise<string> => {
    const query = '¿Cómo se comparan las tendencias actuales con el comportamiento histórico esperado? ¿Hay cambios significativos?';
    return analyzeData(query);
  }, [analyzeData]);
  
  return {
    analyzeData,
    analyzeAnomaly,
    getRecommendations,
    compareTrends,
    isProcessing,
    lastAnalysis,
  };
};