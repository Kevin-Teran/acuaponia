/**
 * @file ParameterCorrelation.tsx
 * @route frontend/src/components/analytics/
 * @description Gráfico de dispersión para correlacionar dos parámetros.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import React, { useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { Skeleton } from '@/components/common/Skeleton';
import { Card } from '@/components/common/Card';
import { SensorType } from '@/types';
import { sensorTypeTranslations } from '@/utils/translations';
import { Settings } from 'lucide-react';

/**
 * @interface CorrelationProps
 * @description Propiedades del componente de correlación
 */
interface CorrelationProps {
  data: { x: number; y: number }[];
  loading: boolean;
  filters: any;
}

/**
 * @component ParameterCorrelation
 * @description Renderiza un gráfico de dispersión para mostrar correlaciones entre parámetros.
 * @param {CorrelationProps} props - Propiedades del componente
 * @returns {React.ReactElement}
 */
export const ParameterCorrelation: React.FC<CorrelationProps> = ({ 
  data, 
  loading, 
  filters 
}) => {
  // Estados locales para los tipos de sensor
  const [sensorTypeX, setSensorTypeX] = useState<SensorType>(SensorType.TEMPERATURE);
  const [sensorTypeY, setSensorTypeY] = useState<SensorType>(SensorType.PH);

  /**
   * @function renderControls
   * @description Renderiza los controles para seleccionar tipos de sensor
   * @returns {React.ReactElement}
   */
  const renderControls = () => (
    <div className="flex flex-col md:flex-row gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
      <div className="flex-1">
        <label 
          htmlFor="sensorTypeX" 
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Parámetro Eje X
        </label>
        <select
          id="sensorTypeX"
          value={sensorTypeX}
          onChange={(e) => setSensorTypeX(e.target.value as SensorType)}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-green-500 transition-colors"
        >
          {Object.entries(sensorTypeTranslations).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
      </div>
      
      <div className="flex-1">
        <label 
          htmlFor="sensorTypeY" 
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          Parámetro Eje Y
        </label>
        <select
          id="sensorTypeY"
          value={sensorTypeY}
          onChange={(e) => setSensorTypeY(e.target.value as SensorType)}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-green-500 transition-colors"
        >
          {Object.entries(sensorTypeTranslations).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  /**
   * @function renderChart
   * @description Renderiza el gráfico de dispersión
   * @returns {React.ReactElement}
   */
  const renderChart = () => {
    if (loading) {
      return <Skeleton className="h-96 w-full" />;
    }

    if (!data || data.length === 0) {
      return (
        <div className="h-96 w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <Settings className="w-12 h-12 text-slate-400 mb-4" />
          <h4 className="text-lg font-semibold text-slate-600 dark:text-slate-300">
            Sin Datos de Correlación
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No se encontraron datos para correlacionar estos parámetros.
          </p>
        </div>
      );
    }

    return (
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
            <XAxis 
              type="number" 
              dataKey="x" 
              name={sensorTypeTranslations[sensorTypeX]} 
              stroke="#94a3b8"
              fontSize={12}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name={sensorTypeTranslations[sensorTypeY]} 
              stroke="#94a3b8"
              fontSize={12}
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: 'rgba(30, 41, 59, 0.9)',
                borderColor: '#334155',
                borderRadius: '0.5rem',
                color: '#cbd5e1',
              }}
              labelStyle={{ color: '#cbd5e1' }}
              formatter={(value: number, name: string) => [
                value.toFixed(2),
                sensorTypeTranslations[name as SensorType] || name
              ]}
            />
            <ZAxis range={[50, 250]} />
            <Scatter 
              name="Correlación" 
              data={data} 
              fill="#3b82f6"
              fillOpacity={0.7}
              stroke="#1e40af"
              strokeWidth={1}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-green-600" />
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          Correlación de Parámetros
        </h3>
      </div>
      
      {renderControls()}
      {renderChart()}
      
      {data && data.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Puntos de Datos:</strong> {data.length} | 
            <strong> Correlación entre:</strong> {sensorTypeTranslations[sensorTypeX]} y {sensorTypeTranslations[sensorTypeY]}
          </p>
        </div>
      )}
    </div>
  );
};