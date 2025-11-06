/**
 * @file ComparativeView.tsx
 * @route frontend/src/components/analytics/
 * @description Componente de vista para el análisis comparativo global de tanques y sensores.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import React from 'react';
import { Card } from '@/components/common/Card';
import { AlertsSummaryCharts } from '@/components/analytics/AlertsSummaryCharts';
import { SensorType } from '@/types';
import { BarChart3, PieChart as PieChartIcon, AlertCircle, Database, Container, Activity, CheckCircle } from 'lucide-react';

interface ComparativeViewProps {
    tanks: any;
    sensors: any;
    kpis: any;
    isAnalyticsLoading: any;
    alertsSummary: any;
    tankStats: any[];
}

/**
 * @function ComparativeView
 * @description Muestra KPIs generales, la distribución de sensores por tanque (tabla) y el resumen de alertas.
 * @param {ComparativeViewProps} props - Propiedades de la vista.
 */
export const ComparativeView: React.FC<ComparativeViewProps> = ({ tanks, sensors, kpis, isAnalyticsLoading, alertsSummary, tankStats }) => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <PieChartIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Vista Comparativa</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Análisis general de todos los tanques</p>
          </div>
        </div>
      </div>

      {/* KPIs Generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Tanques</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{tanks?.length || 0}</p>
            </div>
            <Container className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Sensores Activos</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{sensors?.length || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Alertas Recientes</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{kpis?.count ? Math.floor(kpis.count * 0.05) : 0}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Datos Totales</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{kpis?.count ? (kpis.count / 1000).toFixed(1) + 'K' : '0'}</p>
            </div>
            <Database className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Tabla Comparativa de Tanques (Estilo Unificado) */}
      <Card className="p-0 overflow-hidden">
        <div className="p-6">
            <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-green-600" />
                Distribución de Sensores por Tanque
            </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-100 dark:bg-gray-700/80">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tanque</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Sensores</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Temperatura</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">pH</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Oxígeno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tankStats.map((tank, idx) => (
                <tr key={tank.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{tank.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white font-bold">{tank.sensorsCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-blue-600 dark:text-blue-400">{tank.temperature}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-600 dark:text-green-400">{tank.ph}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-cyan-600 dark:text-cyan-400">{tank.oxygen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {alertsSummary && <AlertsSummaryCharts data={alertsSummary} loading={isAnalyticsLoading.alerts} />}
    </div>
);