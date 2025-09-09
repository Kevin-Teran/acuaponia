/**
 * @file page.tsx
 * @route frontend/src/app/(main)/dashboard/
 * @description Página principal del dashboard, adaptada para nuevos componentes.
 * @author Kevin Mariano
 * @version 6.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useInfrastructure } from '@/hooks/useInfrastructure';
import { DashboardFilters, SummaryCards, GaugeChart, AdminStatCards } from '@/components/dashboard';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Role, SensorType, Settings } from '@/types';
import { getSettings } from '@/services/settingsService';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertCircle, Container } from 'lucide-react';

const LineChart = dynamic(
  () => import('@/components/dashboard/LineChart').then(mod => mod.LineChart),
  {
    ssr: false,
    loading: () => <div className="h-80 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
  }
);

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { tanks, fetchDataForUser } = useInfrastructure(user?.role === Role.ADMIN);
  const {
    summaryData,
    realtimeData,
    historicalData,
    usersList,
    loading,
    error,
    fetchSummary,
    fetchRealtimeData,
    fetchHistoricalData,
    fetchUsersList,
  } = useDashboard();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [filters, setFilters] = useState<any>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (user) {
      getSettings().then(setSettings);
      
      const targetUserId = user.role === Role.ADMIN ? filters.userId : user.id;

      if (user.role === Role.ADMIN) {
        fetchUsersList();
      }
      
      if(targetUserId) {
        fetchDataForUser(targetUserId);
      }
      
      if (!filters.userId) {
        setFilters(prev => ({ ...prev, userId: user.id }));
      }
    }
  }, [user, filters.userId, fetchDataForUser, fetchUsersList]);

  useEffect(() => {
    if (tanks.length > 0 && !filters.tankId) {
      setFilters(prev => ({ ...prev, tankId: tanks[0].id }));
    } else if (tanks.length === 0) {
      setFilters(prev => ({...prev, tankId: undefined}));
    }
  }, [tanks]);

  useEffect(() => {
    if (!filters.tankId) return;
    fetchSummary(filters);
    fetchRealtimeData(filters);
    fetchHistoricalData(filters);
  }, [filters, fetchSummary, fetchRealtimeData, fetchHistoricalData]);

  const chartData = useMemo(() => {
    const transform = (type: SensorType) =>
      historicalData
        .filter(p => p.sensorType === type)
        .map(p => ({
          time: format(new Date(p.timestamp), 'dd/MM HH:mm', { locale: es }),
          value: p.value,
        }))
        .slice(-50);
    return {
      temperature: transform(SensorType.TEMPERATURE),
      ph: transform(SensorType.PH),
      oxygen: transform(SensorType.OXYGEN),
    };
  }, [historicalData]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner message="Verificando sesión..." />
      </div>
    );
  }

  const isAdmin = user.role === Role.ADMIN;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto space-y-8 p-4 md:p-6 lg:p-8"
    >
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard de Monitoreo
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Bienvenido, {user.name}. Estado de tu sistema en tiempo real.
        </p>
      </div>

      <DashboardFilters
        filters={filters}
        onFiltersChange={(newFilters) => setFilters(prev => ({ ...prev, ...newFilters }))}
        tanksList={tanks}
        usersList={usersList}
        currentUserRole={user.role}
        loading={loading}
      />
      
      {loading && !summaryData && <div className="text-center py-12"><LoadingSpinner /></div>}

      {!loading && !filters.tankId ? (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-8 text-center">
          <Container className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-amber-800 dark:text-amber-200 mb-2">
            Selecciona un tanque
          </h3>
        </div>
      ) : (
        <>
          {/* ✅ SE PASAN LOS DATOS Y EL ESTADO DE CARGA CORRECTOS */}
          {isAdmin && <AdminStatCards stats={summaryData?.adminStats} loading={loading} />}
          
          <SummaryCards data={summaryData} loading={loading} currentUserRole={user.role} />
          
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Lecturas en Tiempo Real
            </h2>
            <GaugeChart data={realtimeData} settings={settings} loading={loading} />
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Tendencias Históricas
            </h2>
            <div className="grid grid-cols-1 gap-8">
              <Card className="p-6">
                <LineChart data={chartData.temperature} title="Temperatura" yAxisLabel="°C" lineColor="#ef4444" loading={loading} />
              </Card>
              <Card className="p-6">
                <LineChart data={chartData.ph} title="pH" yAxisLabel="pH" lineColor="#3b82f6" loading={loading} />
              </Card>
              <Card className="p-6">
                <LineChart data={chartData.oxygen} title="Oxígeno Disuelto" yAxisLabel="mg/L" lineColor="#10b981" loading={loading} />
              </Card>
            </div>
          </section>
        </>
      )}
    </motion.div>
  );
};

export default DashboardPage;