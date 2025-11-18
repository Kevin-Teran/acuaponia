/**
 * @file useAnalyticsView.ts
 * @route frontend/src/hooks/
 * @description Hook para gestionar la lógica de vistas de analíticas
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { useMemo } from 'react';
import { SensorType } from '@/types';

interface ViewConfig {
  viewMode: 'comparative' | 'tank_detail' | 'sensor_detail';
  title: string;
  subtitle: string;
  showCorrelation: boolean;
  showTankStats: boolean;
  showAIPanel: boolean;
}

/**
 * @function useAnalyticsView
 * @description Determina la configuración de vista basada en los filtros actuales
 * @param selectedTankId ID del tanque seleccionado ('ALL' para vista global)
 * @param mainSensorType Tipo de sensor seleccionado (undefined para vista sin filtro de sensor)
 * @param tanks Lista de tanques disponibles
 * @returns Configuración de la vista actual
 */
export const useAnalyticsView = (
  selectedTankId: string,
  mainSensorType: SensorType | undefined,
  tanks: any[]
): ViewConfig => {
  return useMemo((): ViewConfig => {
    const selectedTank = tanks?.find((t: any) => t.id === selectedTankId);
    
    // 🌍 Vista Comparativa Global
    // Condición: Todos los tanques + Sin parámetro específico
    if (selectedTankId === 'ALL' && !mainSensorType) {
      return {
        viewMode: 'comparative',
        title: 'Vista Comparativa Global',
        subtitle: 'Análisis general de todos los tanques del sistema',
        showCorrelation: false,
        showTankStats: true,
        showAIPanel: true, // AI puede analizar todos los tanques
      };
    }
    
    // 🏗️ Vista Detalle de Tanque
    // Condición: Tanque específico + Sin parámetro específico
    if (selectedTankId !== 'ALL' && !mainSensorType) {
      return {
        viewMode: 'tank_detail',
        title: `Análisis del Tanque: ${selectedTank?.name || 'Cargando...'}`,
        subtitle: 'Vista detallada con todos los sensores del tanque',
        showCorrelation: true, // Mostrar correlación entre sensores del tanque
        showTankStats: false,
        showAIPanel: true, // AI puede analizar el tanque específico
      };
    }
    
    // 📊 Vista Detalle de Sensor/Parámetro
    // Condición: Con parámetro específico (puede ser global o de tanque)
    const isGlobalParameter = selectedTankId === 'ALL';
    
    return {
      viewMode: 'sensor_detail',
      title: isGlobalParameter
        ? `Análisis Global: ${mainSensorType}`
        : `${selectedTank?.name || ''} - ${mainSensorType}`,
      subtitle: isGlobalParameter
        ? 'Comparativa de este parámetro en todos los tanques'
        : 'Detalle del parámetro en el tanque seleccionado',
      showCorrelation: !isGlobalParameter, // Solo correlación en vista de tanque específico
      showTankStats: false,
      showAIPanel: true, // AI puede analizar el parámetro
    };
  }, [selectedTankId, mainSensorType, tanks]);
};