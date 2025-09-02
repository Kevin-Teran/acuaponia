/**
 * @file SummaryCards.tsx
 * @description Tarjetas de resumen para el dashboard.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */
'use client';

import React from 'react';
import { Container, Activity, Play, AlertTriangle, Database } from 'lucide-react';

interface SummaryCardsProps {
  data: {
    tanksCount: number;
    sensorsCount: number;
    activeSimulations: number;
    recentAlerts: number;
    totalDataPoints: number;
  } | null;
  loading: boolean;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data, loading }) => {
  const cards = [
    {
      title: 'Tanques',
      value: data?.tanksCount || 0,
      icon: Container,
      color: 'blue',
      bgColor: 'bg-blue-100 dark:bg-blue-900/50',
      iconColor: 'text-blue-500'
    },
    {
      title: 'Sensores',
      value: data?.sensorsCount || 0,
      icon: Activity,
      color: 'green',
      bgColor: 'bg-green-100 dark:bg-green-900/50',
      iconColor: 'text-green-500'
    },
    {
      title: 'Simulaciones Activas',
      value: data?.activeSimulations || 0,
      icon: Play,
      color: 'purple',
      bgColor: 'bg-purple-100 dark:bg-purple-900/50',
      iconColor: 'text-purple-500'
    },
    {
      title: 'Alertas Recientes',
      value: data?.recentAlerts || 0,
      icon: AlertTriangle,
      color: 'orange',
      bgColor: 'bg-orange-100 dark:bg-orange-900/50',
      iconColor: 'text-orange-500'
    },
    {
      title: 'Puntos de Datos',
      value: data?.totalDataPoints || 0,
      icon: Database,
      color: 'gray',
      bgColor: 'bg-gray-100 dark:bg-gray-900/50',
      iconColor: 'text-gray-500'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-pulse">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-gray-300 rounded-lg"></div>
              <div className="ml-4 flex-1">
                <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
                <div className="h-6 bg-gray-300 rounded w-12"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center">
            <div className={`h-10 w-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
              <Icon className={`h-6 w-6 ${card.iconColor}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};