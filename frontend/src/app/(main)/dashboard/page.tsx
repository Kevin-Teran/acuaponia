/**
 * @file page.tsx
 * @route /frontend/src/app/(main)/dashboard
 * @description Página principal del dashboard, optimizada para mostrar los 3 sensores principales en gráficos individuales de ancho completo.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic'; 
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useInfrastructure } from '@/hooks/useInfrastructure';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { GaugeChart } from '@/components/dashboard/GaugeChart';
// @ts-ignore
import { Role, SensorType, Settings } from '@/types';
import { getSettings } from '@/services/settingsService';
import { Card } from '@/components/common/Card';
import { format } from 'date-fns';

const LineChart = dynamic(
  () => import('@/components/dashboard/LineChart').then(mod => mod.LineChart), 
  {
    ssr: false, 
    loading: () => <div className="h-80 w-full animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
  }
);


const DashboardPage = () => {
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
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!user) return;
    const initialFetch = async () => {
      if (user.role === Role.ADMIN) await fetchUsersList();
      const fetchedSettings = await getSettings();
      setSettings(fetchedSettings);
    };
    initialFetch();
  }, [user, fetchUsersList]);

  useEffect(() => {
    const targetUserId = filters.userId || user?.id;
    if (targetUserId) fetchDataForUser(targetUserId);
  }, [filters.userId, user?.id, fetchDataForUser]);
  
  useEffect(() => {
    if (tanks.length > 0 && !tanks.some((tank) => tank.id === filters.tankId)) {
      // @ts-ignore
      setFilters((prev) => ({ ...prev, tankId: tanks[0].id }));
    }
  }, [tanks, filters.tankId]);

  useEffect(() => {
    if (filters.tankId) {
      fetchSummary(filters);
      fetchRealtimeData(filters);
      if (filters.startDate && filters.endDate) {
        fetchHistoricalData(filters);
      }
    }
  }, [filters, fetchSummary, fetchRealtimeData, fetchHistoricalData]);

  useEffect(() => {
    if (!filters.tankId) return;
    const interval = setInterval(() => {
      fetchRealtimeData(filters, true);
      fetchSummary(filters, true);
    }, 15000);
    return () => clearInterval(interval);
  }, [filters, fetchRealtimeData, fetchSummary]);

  const handleFiltersChange = useCallback((newFilters: any) => {
    // @ts-ignore
    setFilters((prevFilters) => ({ ...prevFilters, ...newFilters }));
  }, []);
  
  const chartData = useMemo(() => {
    const transformData = (sensorType: SensorType) => {
      if (!historicalData) return [];
      return historicalData
        .filter((point) => point.sensorType === sensorType)
        .map((point) => ({
          time: format(new Date(point.timestamp), 'HH:mm'),
          value: point.value,
        }))
        .sort((a, b) => a.time.localeCompare(b.time));
    };

    return {
      temperature: transformData(SensorType.TEMPERATURE),
      ph: transformData(SensorType.PH),
      oxygen: transformData(SensorType.OXYGEN),
    };
  }, [historicalData]);

  if (!user) return null;

  return (
    <div className="container mx-auto flex flex-col gap-8 p-4 md:p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          Monitoreo en tiempo real de tus sistemas acuapónicos.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-400 bg-red-100 px-4 py-3 text-red-700 dark:bg-red-900/50 dark:text-red-300">
          {error}
        </div>
      )}

      <DashboardFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        usersList={usersList}
        tanksList={tanks}
        currentUserRole={user.role}
        loading={loading}
      />
      
      <SummaryCards data={summaryData} loading={loading} />

      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Lecturas en Tiempo Real
        </h2>
        <GaugeChart data={realtimeData} settings={settings} loading={loading} />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Tendencias Históricas
        </h2>
        <div className="grid grid-cols-1 gap-6"> 
            <Card>
                {/* @ts-ignore */}
                <LineChart
                    data={chartData.temperature}
                    title="Historial de Temperatura"
                    yAxisLabel="°C"
                    lineColor="#ef4444"
                    loading={loading}
                />
            </Card>
            <Card>
                {/* @ts-ignore */}
                <LineChart
                    data={chartData.ph}
                    title="Historial de pH"
                    yAxisLabel="pH"
                    lineColor="#3b82f6"
                    loading={loading}
                />
            </Card>
            <Card>
                {/* @ts-ignore */}
                <LineChart
                    data={chartData.oxygen}
                    title="Oxígeno Disuelto"
                    yAxisLabel="mg/L"
                    lineColor="#10b981"
                    loading={loading}
                />
            </Card>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;