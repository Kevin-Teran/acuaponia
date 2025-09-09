/**
 * @file SummaryCards.tsx
 * @description Muestra tarjetas de resumen con estilos corregidos para modo oscuro.
 * @author Kevin Mariano
 * @version 1.0.1
 * @since 1.0.0
 * @copyright SENA 2025
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Container, Cpu, AlertTriangle, Database, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { Role } from '@/types';

interface SummaryData {
  tanksCount: number;
  sensorsCount: number;
  recentAlerts: number;
  totalDataPoints: number;
}

interface SummaryCardsProps {
  data: SummaryData | null;
  loading: boolean;
  currentUserRole: Role;
}

const StatCard: React.FC<any> = ({ icon: Icon, title, value, iconBgColor, iconColor, borderColor, index, subtitle }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border-l-4 ${borderColor} p-6 border border-gray-200/50 dark:border-gray-700/50`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{(value || 0).toLocaleString()}</p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`${iconBgColor} rounded-xl p-3 shadow-lg`}>
          <Icon className={`h-7 w-7 ${iconColor}`} />
        </div>
      </div>
    </motion.div>
);

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data, loading, currentUserRole }) => {
  const isAdmin = currentUserRole === Role.ADMIN;

  if (loading || !data) {
    const cardCount = isAdmin ? 4 : 3;
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cardCount} gap-6 mb-8`}>
        {Array.from({ length: cardCount }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // ✅ CORRECCIÓN: Se añaden las clases 'dark:border-...' a cada borderColor
  const cards = [
    { icon: Container, title: 'Tanques Activos', value: data.tanksCount, iconBgColor: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400', borderColor: 'border-blue-500 dark:border-blue-400' },
    { icon: Cpu, title: 'Sensores en Línea', value: data.sensorsCount, iconBgColor: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400', borderColor: 'border-green-500 dark:border-green-400' },
    { icon: AlertTriangle, title: 'Alertas Recientes', value: data.recentAlerts, iconBgColor: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-red-600 dark:text-red-400', borderColor: 'border-red-500 dark:border-red-400', subtitle: 'Últimas 24 horas' },
  ];

  if (isAdmin) {
    cards.push({
      icon: Database,
      title: 'Datos Almacenados',
      value: data.totalDataPoints,
      iconBgColor: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400',
      borderColor: 'border-purple-500 dark:border-purple-400',
    });
  }

  return (
    <div className="mb-8">
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${isAdmin ? 4 : 3} gap-6`}>
        {cards.map((card, index) => (
          <StatCard key={card.title} {...card} index={index} />
        ))}
      </div>
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
      >
      </motion.div>
    </div>
  );
};