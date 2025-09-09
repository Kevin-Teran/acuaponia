/**
 * @file KpiCards.tsx
 * @description Componente para mostrar un conjunto de tarjetas de KPIs con layout horizontal.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Kpi } from '@/types';
import { Card } from '@/components/common/Card';
import { Skeleton } from '@/components/common/Skeleton';
import { TrendingUp, TrendingDown, ArrowRight, Activity, Sigma } from 'lucide-react';
import React from 'react';

interface KpiCardsProps {
  kpis: Kpi | null;
  loading: boolean;
}

interface KpiCardProps {
  title: string;
  value: string | number | null | undefined;
  icon: React.ElementType;
}

const KpiCard = ({ title, value, icon: Icon }: KpiCardProps) => (
  <Card className="p-4 shadow-sm transition-shadow hover:shadow-md">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
      <Icon className="w-5 h-5 text-slate-400" />
    </div>
    <p className="mt-2 text-2xl font-bold text-slate-800 dark:text-slate-200">
      {value ?? 'N/A'}
    </p>
  </Card>
);

export const KpiCards = ({ kpis, loading }: KpiCardsProps) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="w-full h-24" />
        ))}
      </div>
    );
  }

  if (!kpis || kpis.count === 0) {
    return (
      <Card className="p-4 text-center text-slate-500 dark:text-slate-400">
        No hay datos suficientes para mostrar KPIs.
      </Card>
    );
  }

  const rangeValue = (kpis.max !== null && kpis.min !== null) 
    ? (kpis.max - kpis.min).toFixed(2) 
    : 'N/A';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <KpiCard title="Promedio" value={kpis.average?.toFixed(2)} icon={Activity} />
      <KpiCard title="Máximo" value={kpis.max?.toFixed(2)} icon={TrendingUp} />
      <KpiCard title="Mínimo" value={kpis.min?.toFixed(2)} icon={TrendingDown} />
      <KpiCard title="Desv. Estándar" value={kpis.stdDev?.toFixed(2)} icon={Sigma} />
      <KpiCard title="Rango (Max-Min)" value={rangeValue} icon={ArrowRight} />
    </div>
  );
};