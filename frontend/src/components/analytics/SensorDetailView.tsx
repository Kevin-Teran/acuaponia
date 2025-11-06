/**
 * @file SensorDetailView.tsx
 * @route frontend/src/components/analytics/
 * @description Componente de vista para el análisis detallado de un parámetro (sensor type), 
 * ya sea a nivel global (todos los tanques) o dentro de un tanque específico.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { KpiCards } from '@/components/analytics/KpiCards';
import { SensorType } from '@/types';

interface SensorDetailViewProps {
    tanks: any;
    kpis: any;
    isAnalyticsLoading: any;
    userSettings: any;
    timeSeriesData: any;
    mainSensorType: SensorType | undefined;
    selectedTankId: string;
    sensorTypeTranslations: any;
    currentRange: any;
    samplingFactor: number;
}

/**
 * @function SensorDetailView
 * @description Muestra KPIs y el gráfico de series de tiempo para un tipo de sensor específico.
 * @param {SensorDetailViewProps} props - Propiedades de la vista.
 */
export const SensorDetailView: React.FC<SensorDetailViewProps> = ({ tanks, kpis, isAnalyticsLoading, userSettings, timeSeriesData, mainSensorType, selectedTankId, sensorTypeTranslations, currentRange, samplingFactor }) => {
    const selectedTank = tanks?.find((t: any) => t.id === selectedTankId);
    
    // Título dinámico basado en la vista (Global vs Detalle de Tanque)
    const title = selectedTankId === 'ALL'
        ? `Análisis Global: ${sensorTypeTranslations[mainSensorType || SensorType.TEMPERATURE]}`
        : `Análisis del Sensor: ${selectedTank?.name || 'Cargando...'} - ${sensorTypeTranslations[mainSensorType || SensorType.TEMPERATURE]}`;
        
    const subtitle = selectedTankId === 'ALL'
        ? 'Comparativa de este parámetro en todos los tanques'
        : `Detalle del parámetro en el tanque seleccionado`;

    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>

        <KpiCards kpis={kpis} loading={isAnalyticsLoading.kpis} />

        <TimeSeriesChart
          data={timeSeriesData}
          loading={isAnalyticsLoading.timeSeries}
          mainSensorType={mainSensorType || SensorType.TEMPERATURE}
          secondarySensorTypes={selectedTankId === 'ALL' ? [] : []} // Solo mostrar el principal en esta vista
          samplingFactor={samplingFactor}
          userSettings={userSettings}
          dateRange={currentRange}
        />
      </div>
    );
};