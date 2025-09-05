/**
 * @file KpiCards.tsx
 * @route frontend/src/components/analytics/
 * @description Componente para mostrar las tarjetas de KPIs.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Card } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { Kpi } from '@/types';
import { Thermometer, Droplet, Wind, Sigma, TrendingUp, TrendingDown, Hash } from 'lucide-react';

interface KpiCardsProps {
  kpis: Kpi | null;
  loading: boolean;
}

const formatValue = (value: number | null | undefined, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '--';
  }
  return value.toFixed(decimals);
};

const kpiConfig = [
  { id: 'average', label: 'Promedio', icon: Sigma },
  { id: 'max', label: 'Máximo', icon: TrendingUp },
  { id: 'min', label: 'Mínimo', icon: TrendingDown },
  { id: 'count', label: 'Registros', icon: Hash },
  { id: 'stdDev', label: 'Desv. Estándar', icon: Thermometer },
];

export const KpiCards = ({ kpis, loading }: KpiCardsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiConfig.map(config => <Skeleton key={config.id} className="h-24 w-full" />)}
      </div>
    );
  }

  const hasNoData = !kpis || !kpis.count;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {kpiConfig.map(config => {
        const Icon = config.icon;
        const value = kpis ? (kpis as any)[config.id] : null;
        
        return (
          <Card key={config.id} className="p-4 flex flex-col justify-between">
            <div className="flex items-center text-slate-500 dark:text-slate-400">
              <Icon className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">{config.label}</span>
            </div>
            <div className="mt-2 text-right">
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {hasNoData ? '--' : formatValue(value, config.id === 'count' ? 0 : 2)}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
};