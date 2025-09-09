/**
 * @file AdminStatCards.tsx
 * @route frontend/src/components/dashboard/
 * @description Tarjetas de estadísticas para admin con colores corregidos para modo oscuro.
 * @author Kevin Mariano
 * @version 1.0.1
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React from 'react';
import { Users, Container, Cpu } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { motion } from 'framer-motion';

interface AdminStatCardsProps {
  stats: {
    totalUsers?: number;
    totalTanks?: number;
    totalSensors?: number;
  } | null;
  loading: boolean;
}

const StatCard = ({ icon: Icon, title, value, colorClass, index }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: index * 0.1 }}
    className="relative overflow-hidden rounded-xl bg-white p-6 shadow-lg border border-gray-200/50 dark:border-gray-700/50 dark:bg-gray-800"
  >
    {/* ✅ CORRECCIÓN DEFINITIVA: La clase de color ahora se aplica correctamente */}
    <div className={`absolute left-0 top-0 h-full w-1.5 ${colorClass}`} />
    <div className="ml-4 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">{value ?? 0}</p>
      </div>
      <div className={`rounded-lg p-3 ${colorClass.replace('bg-', 'bg-opacity-10 bg-')}`}>
        <Icon className={`h-7 w-7 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
  </motion.div>
);

export const AdminStatCards: React.FC<AdminStatCardsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { icon: Users, title: "Usuarios Totales", value: stats.totalUsers, colorClass: "bg-blue-500 dark:bg-blue-400" },
    { icon: Container, title: "Tanques Registrados", value: stats.totalTanks, colorClass: "bg-cyan-500 dark:bg-cyan-400" },
    { icon: Cpu, title: "Sensores Activos", value: stats.totalSensors, colorClass: "bg-amber-500 dark:bg-amber-400" }
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {cards.map((card, index) => (
        <StatCard key={index} {...card} index={index} />
      ))}
    </div>
  );
};