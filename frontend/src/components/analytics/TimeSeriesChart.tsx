/**
 * @file TimeSeriesChart.tsx
 * @route frontend/src/components/analytics/
 * @description Componente para el gráfico de series de tiempo.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '@/components/common/Skeleton';
import { SensorType } from '@/types';

interface TimeSeriesChartProps {
  data: any[];
  loading: boolean;
  sensorType: SensorType;
}

const SENSOR_CONFIG = {
  [SensorType.TEMPERATURE]: { color: '#ef4444', unit: '°C' },
  [SensorType.PH]: { color: '#3b82f6', unit: 'pH' },
  [SensorType.OXYGEN]: { color: '#10b981', unit: 'mg/L' },
  [SensorType.LEVEL]: { color: '#f97316', unit: '%' },
  [SensorType.FLOW]: { color: '#8b5cf6', unit: 'L/min' },
};

export const TimeSeriesChart = ({
  data,
  loading,
  sensorType,
}: TimeSeriesChartProps) => {
  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const chartConfig = SENSOR_CONFIG[sensorType];

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(time) =>
              format(new Date(time), 'd MMM, HH:mm', { locale: es })
            }
          />
          <YAxis
            label={{
              value: chartConfig.unit,
              angle: -90,
              position: 'insideLeft',
            }}
          />
          <Tooltip
            labelFormatter={(label) =>
              format(new Date(label), 'eeee, d MMMM yyyy HH:mm', {
                locale: es,
              })
            }
            formatter={(value) => [`${value} ${chartConfig.unit}`, 'Valor']}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="value"
            stroke={chartConfig.color}
            name={sensorType}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};