/**
 * @file AlertsSummaryCharts.tsx
 * @route frontend/src/components/analytics/
 * @description Muestra gráficos de torta/barra para resumir alertas por tipo y severidad.
 * @author kevin mariano
 * @version 1.0.3
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React from 'react';
import { Card } from '@/components/common/Card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AlertSummary } from '@/types';
import { AlertTriangle, Info } from 'lucide-react';
import { Skeleton } from '../common/Skeleton';
import { cn } from '@/utils/cn';

interface AlertsSummaryChartsProps {
  summary: AlertSummary | null;
  loading: boolean;
}

// Colores consistentes para alertas
const TYPE_COLORS: { [key: string]: string } = {
  TEMPERATURE: '#FF6384',
  PH: '#36A2EB',
  OXYGEN: '#FFCE56',
};

const SEVERITY_COLORS: { [key: string]: string } = {
  LOW: '#22C55E', // green-500
  MEDIUM: '#F59E0B', // amber-500
  HIGH: '#EF4444', // red-500
};

/**
 * @function CustomTooltip
 * @description Tooltip personalizado para los gráficos de pastel
 */
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

// Interfaz para el Payload del label para Recharts
interface PieLabelProps {
    name?: string;
    percent?: number; // Tipado explícito como number
}

export const AlertsSummaryCharts: React.FC<AlertsSummaryChartsProps> = ({ summary, loading }) => {
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

  const alertsByType = summary?.alertsByType.map((item: any) => ({
    name: item.type,
    value: item._count.type,
    fill: TYPE_COLORS[item.type] || '#A0A0A0',
  })) || [];

  const alertsBySeverity = summary?.alertsBySeverity.map((item: any) => ({
    name: item.severity,
    value: item._count.severity,
    fill: SEVERITY_COLORS[item.severity] || '#A0A0A0',
  })) || [];

  const totalAlerts = alertsByType.reduce((sum, item) => sum + item.value, 0);

  if (totalAlerts === 0) {
    return (
      <Card className="p-6 text-center col-span-full">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-amber-500" />
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
                data={alertsByType}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#8884d8"
                labelLine={false}
                // Solución: Usar la interfaz PieLabelProps
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
                // Solución: Usar la interfaz PieLabelProps
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