/**
 * @file AlertsSummaryCharts.tsx
 * @route frontend/src/components/analytics/
 * @description Muestra gráficos de torta/barra para resumir alertas por tipo y severidad.
 * @author kevin mariano
 * @version 1.0.6 // Versión corregida para coincidir con AlertSummary type
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React from 'react';
import { Card } from '@/components/common/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AlertSummary } from '@/types'; 
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from '../common/Skeleton';

interface AlertsSummaryChartsProps {
  summary: AlertSummary | null;
  loading: boolean;
}

const TYPE_COLORS: { [key: string]: string } = {
  TEMPERATURE_HIGH: '#FF6384',
  TEMPERATURE_LOW: '#E94F74',
  PH_HIGH: '#36A2EB',
  PH_LOW: '#2C87C0',
  OXYGEN_HIGH: '#FFCE56',
  OXYGEN_LOW: '#E0B84D',
  TEMPERATURE: '#FF6384',
  PH: '#36A2EB',
  OXYGEN: '#FFCE56',
  TEMPERATURE_OUT_OF_RANGE: '#FF6384',
  PH_OUT_OF_RANGE: '#36A2EB',
  OXYGEN_OUT_OF_RANGE: '#FFCE56',
  SENSOR_DISCONNECTED: '#9CA3AF',
  SYSTEM_FAILURE: '#000000',
};

const SEVERITY_COLORS: { [key: string]: string } = {
  INFO: '#3B82F6',
  LOW: '#22C55E', 
  WARNING: '#F59E0B',
  MEDIUM: '#F59E0B', 
  HIGH: '#EF4444', 
  ERROR: '#EF4444',
  CRITICAL: '#991B1B', 
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="p-2 bg-white border border-gray-300 shadow-md rounded-lg dark:bg-slate-800 dark:border-slate-700">
        <p className="font-semibold text-slate-900 dark:text-white">{data.name}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Total: <span className="font-bold">{data.value}</span>
        </p>
      </div>
    );
  }
  return null;
};

interface PieLabelProps {
    name?: string;
    percent?: number; 
}

export const AlertsSummaryCharts: React.FC<AlertsSummaryChartsProps> = ({ summary, loading }) => {
  
  // Calcular el total dinámicamente basado en los arrays recibidos
  const totalAlerts = React.useMemo(() => {
    if (!summary?.alertsByType) return 0;
    return summary.alertsByType.reduce((acc, item) => acc + (item._count?.type || 0), 0);
  }, [summary]);

  if (!loading && summary) {
      console.log('🚨 [Alerts Chart] Resumen recibido:', summary);
      if (totalAlerts === 0) {
          console.warn('🚨 [Alerts Chart] Alertas no dibujadas: total es 0. Verifica los filtros de tiempo en la UI.');
      }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="h-[400px]">
          <Skeleton className="h-full w-full" />
        </Card>
        <Card className="h-[400px]">
          <Skeleton className="h-full w-full" />
        </Card>
      </div>
    );
  }

  // Mapeo de datos del resumen por tipo
  const chartDataByType = summary?.alertsByType?.map((item) => ({
    name: item.type.replace(/_/g, ' '), 
    value: item._count.type, 
    fill: TYPE_COLORS[item.type] || '#A0A0A0',
  })) || [];

  // Mapeo de datos del resumen por severidad
  const chartDataBySeverity = summary?.alertsBySeverity?.map((item) => ({
    name: item.severity,
    value: item._count.severity,
    fill: SEVERITY_COLORS[item.severity] || '#A0A0A0',
  })) || [];

  if (totalAlerts === 0) {
    return (
      <Card className="p-6 text-center col-span-full flex flex-col items-center justify-center h-[200px]">
        <AlertTriangle className="w-12 h-12 mb-4 text-amber-500" />
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Sin Alertas Registradas</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          No se encontraron alertas en el rango de tiempo y filtros seleccionados.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Gráfico 1: Alertas por Tipo de Sensor */}
      <Card className="p-6 h-[400px] flex flex-col">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Alertas por Tipo de Sensor
        </h2>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartDataByType}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                labelLine={false}
                label={({ name, percent }: PieLabelProps) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`} 
              >
                {chartDataByType.map((entry, index) => (
                  <Cell key={`cell-type-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: '10px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Gráfico 2: Alertas por Severidad */}
      <Card className="p-6 h-[400px] flex flex-col">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">
          Alertas por Severidad
        </h2>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartDataBySeverity}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#82ca9d"
                labelLine={false}
                label={({ name, percent }: PieLabelProps) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
              >
                {chartDataBySeverity.map((entry, index) => (
                  <Cell key={`cell-severity-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: '10px', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};