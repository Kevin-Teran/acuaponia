/**
 * @file ParameterCorrelation.tsx
 * @route frontend/src/components/analytics/
 * @description Gráfico de dispersión para correlacionar dos parámetros.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

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

interface CorrelationProps {
  data: { x: number; y: number }[];
  loading: boolean;
  filters: any;
}

export const ParameterCorrelation = ({ data, loading, filters }: CorrelationProps) => {
  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid />
          <XAxis type="number" dataKey="x" name={filters.sensorTypeX} />
          <YAxis type="number" dataKey="y" name={filters.sensorTypeY} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Correlación" data={data} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};