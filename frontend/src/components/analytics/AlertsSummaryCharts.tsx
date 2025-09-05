/**
 * @file AlertsSummaryCharts.tsx
 * @route frontend/src/components/analytics/
 * @description Componentes para los gráficos de resumen de alertas.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Skeleton } from '@/components/common/Skeleton';
import { Card } from '../common/Card';

interface AlertsSummaryChartsProps {
  data: any;
  loading: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const AlertsSummaryCharts = ({
  data,
  loading,
}: AlertsSummaryChartsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="Alertas por Tipo">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.alertsByType} layout="vertical">
              <XAxis type="number" />
              <YAxis dataKey="type" type="category" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="_count.type" name="Cantidad" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Alertas por Severidad">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.alertsBySeverity}
                dataKey="_count.severity"
                nameKey="severity"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                label
              >
                {data.alertsBySeverity.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};