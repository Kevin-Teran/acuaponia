/**
 * @file LineChart.tsx
 * @route frontend/src/components/dashboard/
 * @description Componente de gráfico de líneas reutilizable con puntos interactivos al pasar el ratón.
 * @author Kevin Mariano 
 * @version 3.4.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import React from 'react';

interface ChartDataPoint {
  time: string;
  value: number;
}

interface LineChartProps {
  data: ChartDataPoint[];
  title: string;
  yAxisLabel: string;
  lineColor: string;
  loading: boolean;
}

// Se restaura la exportación nombrada ('export const') para que sea compatible con el archivo index.ts
export const LineChart = ({
  data,
  title,
  yAxisLabel,
  lineColor,
  loading,
}: LineChartProps): JSX.Element => {
  const strokeColor = '#374151';
  const gridColor = '#E5E7EB';
  const tooltipBackgroundColor = '#FFFFFF';

  if (loading) {
    return (
      <div className="h-80 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex h-80 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-gray-50 p-4 text-center dark:bg-gray-800">
        <TrendingUp className="h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-gray-200">
          {title}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          No hay datos disponibles para el rango seleccionado.
        </p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <h3 className="mb-4 text-center text-lg font-bold text-gray-800 dark:text-gray-200">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="time"
            stroke={strokeColor}
            tick={{ fontSize: 12 }}
            angle={-25}
            textAnchor="end"
          />
          <YAxis
            stroke={strokeColor}
            tick={{ fontSize: 12 }}
            label={{
              value: yAxisLabel,
              angle: -90,
              position: 'insideLeft',
              fill: strokeColor,
              fontSize: 14,
              offset: -10,
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: tooltipBackgroundColor,
              borderColor: gridColor,
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: strokeColor, fontWeight: 'bold' }}
            itemStyle={{ color: lineColor }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6, fill: lineColor, stroke: 'white', strokeWidth: 2 }}
            name={yAxisLabel}
            connectNulls={true}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
};