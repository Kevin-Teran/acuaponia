/**
 * @file TimeSeriesChart.tsx
 * @route frontend/src/components/analytics/
 * @description Componente para el gráfico de series de tiempo.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/common/Skeleton';
import { TimeSeriesData, SensorType } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Info } from 'lucide-react';

interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  loading: boolean;
  sensorType: SensorType;
}

const sensorConfig = {
  [SensorType.TEMPERATURE]: { color: '#3b82f6', unit: '°C' },
  [SensorType.PH]: { color: '#8b5cf6', unit: '' },
  [SensorType.OXYGEN]: { color: '#10b981', unit: 'mg/L' },
};

export const TimeSeriesChart = ({ data, loading, sensorType }: TimeSeriesChartProps) => {
  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="h-96 w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-lg">
        <Info className="w-12 h-12 text-slate-400 mb-4" />
        <h4 className="text-lg font-semibold text-slate-600 dark:text-slate-300">No se encontraron datos</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400">Intenta seleccionar otro período de tiempo o tanque.</p>
      </div>
    );
  }

  const config = sensorConfig[sensorType] || { color: '#64748b', unit: '' };

  const formattedData = data.map(d => ({
    ...d,
    timestamp: format(new Date(d.timestamp), 'MMM d, HH:mm', { locale: es }),
  }));

  return (
    <div className="h-96 w-full">
      <ResponsiveContainer>
        <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={12} />
          <YAxis stroke="#94a3b8" fontSize={12} unit={config.unit} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(30, 41, 59, 0.9)',
              borderColor: '#334155',
              borderRadius: '0.5rem',
            }}
            labelStyle={{ color: '#cbd5e1' }}
            itemStyle={{ color: config.color }}
          />
          <Legend />
          <Line type="monotone" dataKey="value" name={sensorType} stroke={config.color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};