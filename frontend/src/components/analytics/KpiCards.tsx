/**
 * @file KpiCards.tsx
 * @route frontend/src/components/analytics/
 * @description Componente para mostrar las tarjetas de KPIs.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { ArrowDown, ArrowUp, BarChart, Hash, Thermometer } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';

interface KpiCardsProps {
  kpis: any;
  loading: boolean;
}

const KpiCard = ({ icon, title, value, unit, loading, colorClass }: any) => {
  const content = loading ? (
    <Skeleton className="h-28 w-full" />
  ) : (
    <div className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow transition-all hover:shadow-md hover:-translate-y-1">
      <div className={`p-3 rounded-full ${colorClass.bg}`}>
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {value != null ? `${parseFloat(value).toFixed(2)} ${unit}`.trim() : 'N/A'}
        </p>
      </div>
    </div>
  );
  return content;
};

export const KpiCards = ({ kpis, loading }: KpiCardsProps) => {
  const kpiData = [
    {
      title: 'Promedio', value: kpis?.average,
      icon: <Thermometer className="h-6 w-6 text-blue-800 dark:text-blue-300" />,
      colorClass: { bg: "bg-blue-100 dark:bg-blue-900/50" }
    },
    {
      title: 'Máximo', value: kpis?.max,
      icon: <ArrowUp className="h-6 w-6 text-green-800 dark:text-green-300" />,
      colorClass: { bg: "bg-green-100 dark:bg-green-900/50" }
    },
    {
      title: 'Mínimo', value: kpis?.min,
      icon: <ArrowDown className="h-6 w-6 text-red-800 dark:text-red-300" />,
      colorClass: { bg: "bg-red-100 dark:bg-red-900/50" }
    },
    {
      title: 'Desv. Estándar', value: kpis?.stdDev,
      icon: <BarChart className="h-6 w-6 text-yellow-800 dark:text-yellow-300" />,
      colorClass: { bg: "bg-yellow-100 dark:bg-yellow-900/50" }
    },
    {
      title: 'Nº de Registros', value: kpis?.count, unit: '',
      icon: <Hash className="h-6 w-6 text-indigo-800 dark:text-indigo-300" />,
      colorClass: { bg: "bg-indigo-100 dark:bg-indigo-900/50" }
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {kpiData.map((kpi, index) => (
        <KpiCard
          key={index}
          title={kpi.title}
          value={kpi.value}
          unit={kpi.unit ?? ''}
          icon={kpi.icon}
          loading={loading}
          colorClass={kpi.colorClass}
        />
      ))}
    </div>
  );
};