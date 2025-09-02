/**
 * @file LineChart.tsx
 * @description Componente de gráfico de líneas para datos históricos.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */
'use client';

import React, { useMemo } from 'react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SensorType } from '@/types';
import { TrendingUp } from 'lucide-react';

interface HistoricalDataPoint {
  timestamp: string;
  value: number;
  sensorName: string;
  sensorType: SensorType;
  tankName: string;
}

interface LineChartProps {
  data: HistoricalDataPoint[];
  loading: boolean;
  height?: number;
}

const getSensorTypeColor = (type: SensorType): string => {
  const colors = {
    TEMPERATURE: '#ef4444', // red-500
    PH: '#3b82f6',          // blue-500
    OXYGEN: '#10b981',      // emerald-500
    LEVEL: '#8b5cf6',       // violet-500
    FLOW: '#f59e0b'         // amber-500
  };
  return colors[type] || '#6b7280';
};

const getSensorTypeLabel = (type: SensorType): string => {
  const labels = {
    TEMPERATURE: 'Temperatura (°C)',
    PH: 'pH',
    OXYGEN: 'Oxígeno (mg/L)',
    LEVEL: 'Nivel (%)',
    FLOW: 'Caudal (L/min)'
  };
  return labels[type] || type;
};

export const LineChart: React.FC<LineChartProps> = ({ data, loading, height = 400 }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Agrupar datos por timestamp y crear estructura para el gráfico
    const groupedByTime = data.reduce((acc, point) => {
      const timeKey = format(new Date(point.timestamp), 'yyyy-MM-dd HH:mm');
      if (!acc[timeKey]) {
        acc[timeKey] = { timestamp: timeKey, originalTimestamp: point.timestamp };
      }
      
      // Crear una clave única para cada sensor
      const sensorKey = `${point.sensorName}_${point.sensorType}`;
      acc[timeKey][sensorKey] = point.value;
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(groupedByTime).sort((a: any, b: any) => 
      new Date(a.originalTimestamp).getTime() - new Date(b.originalTimestamp).getTime()
    );
  }, [data]);

  const sensorLines = useMemo(() => {
    if (!data || data.length === 0) return [];

    const uniqueSensors = Array.from(new Set(
      data.map(point => `${point.sensorName}_${point.sensorType}`)
    ));

    return uniqueSensors.map(sensorKey => {
      const [sensorName, sensorType] = sensorKey.split('_');
      return {
        key: sensorKey,
        name: `${sensorName} (${getSensorTypeLabel(sensorType as SensorType)})`,
        color: getSensorTypeColor(sensorType as SensorType),
        type: sensorType as SensorType
      };
    });
  }, [data]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
          <div className="h-80 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center mb-6">
        <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No hay datos históricos</h3>
        <p className="text-gray-500 dark:text-gray-400">
          Selecciona un rango de fechas para ver los datos históricos.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Datos Históricos ({data.length} puntos)
      </h3>
      
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="timestamp"
            tickFormatter={(value) => format(new Date(value), 'HH:mm', { locale: es })}
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip 
            labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: es })}
            formatter={(value: number, name: string) => [`${value.toFixed(2)}`, name]}
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Legend />
          {sensorLines.map(sensor => (
            <Line
              key={sensor.key}
              type="monotone"
              dataKey={sensor.key}
              stroke={sensor.color}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={sensor.name}
              connectNulls={false}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};
