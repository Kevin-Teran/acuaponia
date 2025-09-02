import React from 'react';
import { SummaryData } from '@/types/dashboard';
import { Skeleton } from '@/components/common/Skeleton';
import { Container, Cpu, AlertTriangle, Database } from 'lucide-react';

interface SummaryCardsProps {
  data: SummaryData | null;
  loading: boolean;
}

const StatCard = ({ icon: Icon, title, value, color }: any) => (
  // Estética: Bordes más redondeados
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex items-center transition-colors duration-300">
    <div className={`p-3 rounded-full mr-4 ${color}`}>
      <Icon className="h-6 w-6 text-white" />
    </div>
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  </div>
);

export const SummaryCards = ({ data, loading }: SummaryCardsProps) => {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          // Estética: Bordes más redondeados para el esqueleto
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const cards = [
    { icon: Container, title: 'Tanques Activos', value: data.tanksCount, color: 'bg-blue-500' },
    { icon: Cpu, title: 'Sensores en Línea', value: data.sensorsCount, color: 'bg-green-500' },
    { icon: AlertTriangle, title: 'Alertas (24h)', value: data.recentAlerts, color: 'bg-yellow-500' },
    { icon: Database, title: 'Datos Totales', value: data.totalDataPoints.toLocaleString(), color: 'bg-indigo-500' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {cards.map((card, index) => (
        <StatCard key={index} {...card} />
      ))}
    </div>
  );
};