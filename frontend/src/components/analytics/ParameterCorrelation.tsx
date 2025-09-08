/**
 * @file ParameterCorrelation.tsx
 * @route frontend/src/components/analytics/
 * @description Gráfico de dispersión para correlacionar dos parámetros - VERSIÓN CORREGIDA.
 * @author kevin mariano
 * @version 2.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import React, { useState, useCallback, useEffect } from 'react';
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
import { SensorType } from '@/types';
import { sensorTypeTranslations } from '@/utils/translations';
import { Settings, TrendingUp } from 'lucide-react';
import * as analyticsService from '@/services/analyticsService';
import { useAuth } from '@/context/AuthContext';

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
  data: initialData, 
  loading: initialLoading, 
  filters 
}) => {
  const { user } = useAuth();
  
  // Estados locales para los tipos de sensor
  const [sensorTypeX, setSensorTypeX] = useState<SensorType>(SensorType.TEMPERATURE);
  const [sensorTypeY, setSensorTypeY] = useState<SensorType>(SensorType.PH);
  
  // Estados para datos y carga local
  const [localData, setLocalData] = useState<{ x: number; y: number }[]>(initialData);
  const [localLoading, setLocalLoading] = useState(false);
  const [hasCustomSelection, setHasCustomSelection] = useState(false);

  /**
   * @function fetchCorrelationData
   * @description Obtiene datos de correlación basados en la selección actual
   */
  const fetchCorrelationData = useCallback(async () => {
    if (!user || !hasCustomSelection) return;

    console.log('🔄 [ParameterCorrelation] Obteniendo correlación personalizada:', {
      sensorTypeX,
      sensorTypeY,
      filters
    });

    setLocalLoading(true);
    
    try {
      const correlationFilters = {
        ...filters,
        sensorTypeX,
        sensorTypeY,
      };

      const newData = await analyticsService.getCorrelations(correlationFilters);
      setLocalData(newData);
      
      console.log('✅ [ParameterCorrelation] Datos obtenidos:', newData.length, 'puntos');
    } catch (error) {
      console.error('❌ [ParameterCorrelation] Error obteniendo correlación:', error);
      setLocalData([]);
    } finally {
      setLocalLoading(false);
    }
  }, [sensorTypeX, sensorTypeY, filters, user, hasCustomSelection]);

  /**
   * @function handleSensorTypeXChange
   * @description Maneja el cambio del tipo de sensor X
   */
  const handleSensorTypeXChange = useCallback((newType: SensorType) => {
    console.log('🔄 [ParameterCorrelation] Cambiando sensor X:', newType);
    setSensorTypeX(newType);
    setHasCustomSelection(true);
  }, []);

  /**
   * @function handleSensorTypeYChange
   * @description Maneja el cambio del tipo de sensor Y
   */
  const handleSensorTypeYChange = useCallback((newType: SensorType) => {
    console.log('🔄 [ParameterCorrelation] Cambiando sensor Y:', newType);
    setSensorTypeY(newType);
    setHasCustomSelection(true);
  }, []);

  // Efecto para obtener nuevos datos cuando cambian los tipos de sensor
  useEffect(() => {
    if (hasCustomSelection) {
      fetchCorrelationData();
    }
  }, [fetchCorrelationData, hasCustomSelection]);

  // Usar datos iniciales si no hay selección personalizada
  useEffect(() => {
    if (!hasCustomSelection) {
      setLocalData(initialData);
    }
  }, [initialData, hasCustomSelection]);

  // Determinar qué datos y estado de carga usar
  const dataToUse = localData;
  const loadingToUse = hasCustomSelection ? localLoading : initialLoading;

  /**
   * @function renderControls
   * @description Renderiza los controles para seleccionar tipos de sensor
   * @returns {React.ReactElement}
   */
  const renderControls = () => (
    <div className="flex flex-col md:flex-row gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex-1">
        <label 
          htmlFor="sensorTypeX" 
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
        >
          📊 Parámetro Eje X
        </label>
        <select
          id="sensorTypeX"
          value={sensorTypeX}
          onChange={(e) => handleSensorTypeXChange(e.target.value as SensorType)}
          disabled={loadingToUse}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {Object.entries(sensorTypeTranslations).map(([key, value]) => (
            <option key={key} value={key} disabled={key === sensorTypeY}>
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
          📈 Parámetro Eje Y
        </label>
        <select
          id="sensorTypeY"
          value={sensorTypeY}
          onChange={(e) => handleSensorTypeYChange(e.target.value as SensorType)}
          disabled={loadingToUse}
          className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {Object.entries(sensorTypeTranslations).map(([key, value]) => (
            <option key={key} value={key} disabled={key === sensorTypeX}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end">
        <button
          onClick={() => {
            setHasCustomSelection(true);
            fetchCorrelationData();
          }}
          disabled={loadingToUse || sensorTypeX === sensorTypeY}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Analizar
        </button>
      </div>
    </div>
  );

  /**
   * @function renderChart
   * @description Renderiza el gráfico de dispersión
   * @returns {React.ReactElement}
   */
  const renderChart = () => {
    if (loadingToUse) {
      return (
        <div className="h-96 w-full flex items-center justify-center">
          <Skeleton className="h-96 w-full" />
        </div>
      );
    }

    if (!dataToUse || dataToUse.length === 0) {
      return (
        <div className="h-96 w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600">
          <Settings className="w-16 h-16 text-slate-400 mb-4" />
          <h4 className="text-xl font-semibold text-slate-600 dark:text-slate-300 mb-2">
            Sin Datos de Correlación
          </h4>
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md">
            No se encontraron datos simultáneos para correlacionar {sensorTypeTranslations[sensorTypeX]} y {sensorTypeTranslations[sensorTypeY]}.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Intenta seleccionar otros parámetros o un período de tiempo diferente.
          </p>
        </div>
      );
    }

    return (
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis 
              type="number" 
              dataKey="x" 
              name={sensorTypeTranslations[sensorTypeX]} 
              stroke="#64748b"
              fontSize={12}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name={sensorTypeTranslations[sensorTypeY]} 
              stroke="#64748b"
              fontSize={12}
              tickFormatter={(value) => value.toFixed(1)}
            />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{
                backgroundColor: 'rgba(30, 41, 59, 0.95)',
                borderColor: '#334155',
                borderRadius: '0.5rem',
                color: '#cbd5e1',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              }}
              labelStyle={{ color: '#cbd5e1' }}
              formatter={(value: number, name: string) => [
                `${value.toFixed(2)}`,
                name === 'x' ? sensorTypeTranslations[sensorTypeX] : sensorTypeTranslations[sensorTypeY]
              ]}
              labelFormatter={() => 'Correlación de Parámetros'}
            />
            <ZAxis range={[40, 200]} />
            <Scatter 
              name="correlacion" 
              data={dataToUse} 
              fill="#3b82f6"
              fillOpacity={0.7}
              stroke="#1e40af"
              strokeWidth={1.5}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    );
  };

  /**
   * @function calculateCorrelationCoefficient
   * @description Calcula el coeficiente de correlación de Pearson
   * @returns {number} Coeficiente de correlación (-1 a 1)
   */
  const calculateCorrelationCoefficient = (): number => {
    if (!dataToUse || dataToUse.length < 2) return 0;

    const n = dataToUse.length;
    const sumX = dataToUse.reduce((sum, point) => sum + point.x, 0);
    const sumY = dataToUse.reduce((sum, point) => sum + point.y, 0);
    const sumXY = dataToUse.reduce((sum, point) => sum + (point.x * point.y), 0);
    const sumX2 = dataToUse.reduce((sum, point) => sum + (point.x * point.x), 0);
    const sumY2 = dataToUse.reduce((sum, point) => sum + (point.y * point.y), 0);

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

    return denominator === 0 ? 0 : numerator / denominator;
  };

  /**
   * @function getCorrelationStrength
   * @description Interpreta la fuerza de la correlación
   * @param {number} coefficient - Coeficiente de correlación
   * @returns {object} Objeto con fuerza y color
   */
  const getCorrelationStrength = (coefficient: number) => {
    const absCoeff = Math.abs(coefficient);
    if (absCoeff >= 0.8) return { strength: 'Muy Fuerte', color: 'text-red-600 dark:text-red-400' };
    if (absCoeff >= 0.6) return { strength: 'Fuerte', color: 'text-orange-600 dark:text-orange-400' };
    if (absCoeff >= 0.4) return { strength: 'Moderada', color: 'text-yellow-600 dark:text-yellow-400' };
    if (absCoeff >= 0.2) return { strength: 'Débil', color: 'text-blue-600 dark:text-blue-400' };
    return { strength: 'Muy Débil', color: 'text-gray-600 dark:text-gray-400' };
  };

  const correlationCoeff = calculateCorrelationCoefficient();
  const correlationInfo = getCorrelationStrength(correlationCoeff);

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
          <Settings className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
            Correlación de Parámetros
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Analiza la relación entre diferentes variables del sistema
          </p>
        </div>
      </div>
      
      {renderControls()}
      {renderChart()}
      
      {dataToUse && dataToUse.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Información estadística */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h5 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
              📊 Estadísticas
            </h5>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Puntos de Datos:</strong> {dataToUse.length}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Rango X:</strong> {Math.min(...dataToUse.map(d => d.x)).toFixed(2)} - {Math.max(...dataToUse.map(d => d.x)).toFixed(2)}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400">
              <strong>Rango Y:</strong> {Math.min(...dataToUse.map(d => d.y)).toFixed(2)} - {Math.max(...dataToUse.map(d => d.y)).toFixed(2)}
            </p>
          </div>

          {/* Coeficiente de correlación */}
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h5 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">
              🔗 Coeficiente de Correlación
            </h5>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
              {correlationCoeff.toFixed(3)}
            </p>
            <p className={`text-sm font-medium ${correlationInfo.color}`}>
              {correlationInfo.strength}
            </p>
          </div>

          {/* Interpretación */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h5 className="font-semibold text-green-800 dark:text-green-300 mb-2">
              📈 Interpretación
            </h5>
            <p className="text-sm text-green-700 dark:text-green-400">
              <strong>Relación:</strong> {correlationCoeff > 0 ? 'Positiva' : correlationCoeff < 0 ? 'Negativa' : 'Sin correlación'}
            </p>
            <p className="text-sm text-green-700 dark:text-green-400">
              <strong>Entre:</strong> {sensorTypeTranslations[sensorTypeX]} y {sensorTypeTranslations[sensorTypeY]}
            </p>
          </div>
        </div>
      )}

      {/* Estado de carga personalizado */}
      {loadingToUse && hasCustomSelection && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-2">
            <div className="animate-spin w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              Calculando correlación entre {sensorTypeTranslations[sensorTypeX]} y {sensorTypeTranslations[sensorTypeY]}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};