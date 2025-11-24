/**
 * @file AlertsSummaryCharts.tsx
 * @route frontend/src/components/analytics/
 * @description Muestra gráficos de torta/barra para resumir alertas por tipo y severidad.
 * @author kevin mariano
 * @version 1.0.5 // Versión final, exportación corregida
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
import { cn } from '@/utils/cn';

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
};

const SEVERITY_COLORS: { [key: string]: string } = {
  LOW: '#22C55E', 
  MEDIUM: '#F59E0B', 
  HIGH: '#EF4444', 
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
  
  if (!loading && summary) {
      console.log('🚨 [Alerts Chart] Resumen recibido:', summary);
      if (summary.total === 0) {
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

  const totalAlerts = summary?.total || 0;

  // Mapeo de datos del resumen por tipo
  const alertsByType = summary?.distributionByType?.map((item: any) => ({
    name: item.type.replace(/_/g, ' '), 
    value: item.count, // Usamos 'count'
    fill: TYPE_COLORS[item.type] || '#A0A0A0',
  })) || [];

  // Mapeo de datos del resumen por severidad
  const alertsBySeverity = summary?.distributionBySeverity?.map((item: any) => ({
    name: item.severity,
    value: item.count, // Usamos 'count'
    fill: SEVERITY_COLORS[item.severity] || '#A0A0A0',
  })) || [];

  if (totalAlerts === 0) {
    return (
      <Card className="p-6 text-center col-span-full">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Sin Alertas Registradas</h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          No se encontraron alertas en el rango de tiempo y filtros seleccionados.
          <span className="block mt-1 text-sm font-semibold text-gray-600 dark:text-gray-500">
            (Conteo total de la base de datos: {totalAlerts})
          </span>
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
                data={alertsByType}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#8884d8"
                labelLine={false}
                label={({ name, percent }: PieLabelProps) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`} 
              >
                {alertsByType.map((entry, index) => (
                  <Cell key={`cell-type-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: '20px' }} />
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
                data={alertsBySeverity}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#82ca9d"
                labelLine={false}
                label={({ name, percent }: PieLabelProps) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
              >
                {alertsBySeverity.map((entry, index) => (
                  <Cell key={`cell-severity-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ paddingLeft: '20px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};