"use client";

import React from 'react';
import { Card } from '@/components/common/Card';
import { LineChart } from '@/components/dashboard/LineChart';
import { useSensorData } from '@/hooks/useSensorData';
import { DataSummary, ProcessedDataPoint } from '@/types';
import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';


/**
 * @component Analytics
 * @description Componente de página para visualizar análisis de datos históricos de los sensores.
 * Muestra gráficos de línea para temperatura, pH y oxígeno a lo largo del tiempo.
 */
const Analytics: React.FC = () => {
  const { data, summary } = useSensorData();

  /**
   * @function getRecommendations
   * @description Genera una lista de recomendaciones para el sistema basándose en el resumen de datos.
   * Esta es una versión simplificada, se puede expandir para un análisis más profundo.
   * @param {DataSummary | null} currentSummary - El resumen de los datos de los sensores.
   * @returns {Array<object>} Un array de objetos de recomendación.
   */
  const getRecommendations = (currentSummary: DataSummary | null) => {
    if (!currentSummary) return [];
    const recommendations = [];
    
    // Recomendaciones basadas en rangos óptimos
    if (currentSummary.temperature.avg < 20 || currentSummary.temperature.avg > 28) {
        recommendations.push({ type: 'warning', parameter: 'Temperatura', message: 'La temperatura promedio histórica está fuera del rango óptimo.' });
    }
    if (currentSummary.ph.avg < 6.8 || currentSummary.ph.avg > 7.6) {
        recommendations.push({ type: 'alert', parameter: 'pH', message: 'El pH promedio histórico muestra desviaciones significativas.' });
    }
    if (currentSummary.oxygen.avg < 6) {
        recommendations.push({ type: 'alert', parameter: 'Oxígeno', message: 'El nivel de oxígeno promedio histórico es bajo.' });
    }
    
    if (recommendations.length === 0) {
      recommendations.push({ type: 'success', parameter: 'Sistema', message: 'Los parámetros históricos se mantienen dentro de los rangos óptimos.' });
    }
    
    return recommendations;
  };

  const recommendations = getRecommendations(summary);

  const createChartData = (processedData: ProcessedDataPoint[], key: keyof Omit<ProcessedDataPoint, 'timestamp'>, label: string, color: string) => {
    return {
      labels: processedData.map(d => d.timestamp),
      datasets: [{
        label,
        data: processedData.map(d => d[key]),
        borderColor: color,
        backgroundColor: `${color}40`,
        tension: 0.4,
      }]
    };
  };

  const hasData = data && data.length > 0;
  const startDate = hasData ? data[0].timestamp : '';
  const endDate = hasData ? data[data.length - 1].timestamp : '';
  
  const thresholds = {
    temperature: { min: 22, max: 26 },
    ph: { min: 6.8, max: 7.6 },
    oxygen: { min: 6, max: 10 },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Análisis de Datos Históricos
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Visualización de tendencias y análisis de parámetros a lo largo del tiempo.
        </p>
      </div>

      <Card title="Resumen de Recomendaciones" subtitle="Análisis de los promedios históricos">
        <div className="space-y-4">
          {recommendations.map((rec, index) => {
            const Icon = rec.type === 'success' ? CheckCircle : AlertTriangle;
            const colorClasses = 
                rec.type === 'success' ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30' :
                rec.type === 'warning' ? 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30' :
                'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30';
            
            const textColor = colorClasses.split(' ')[0] + ' ' + colorClasses.split(' ')[2];
            const bgColor = colorClasses.split(' ')[1] + ' ' + colorClasses.split(' ')[3];

            return (
              <div key={index} className={`p-4 rounded-lg ${bgColor}`}>
                <div className="flex items-start space-x-3">
                  <Icon className={`w-5 h-5 mt-0.5 ${textColor}`} />
                  <div className="flex-1">
                    <span className={`font-semibold ${textColor}`}>{rec.parameter}</span>
                    <p className="text-gray-700 dark:text-gray-300 mt-1 mb-2">{rec.message}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChart
            data={data}
            thresholds={thresholds}
            startDate={startDate}
            endDate={endDate}
        />
      </div>
    </div>
  );
};

export default Analytics;