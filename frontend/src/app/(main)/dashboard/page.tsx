/**
 * @file page.tsx
 * @route /dashboard
 * @description Página principal del dashboard con datos en tiempo real y históricos.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useInfrastructure } from '@/hooks/useInfrastructure';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { GaugeChart } from '@/components/dashboard/GaugeChart';
import { LineChart } from '@/components/dashboard/LineChart';
import { Role, Settings } from '@/types';
import { getSettings } from '@/services/settingsService';

const DashboardPage = () => {
  const { user } = useAuth();
  // La lista de tanques se recibe en la variable 'tanks'
  const { tanks, fetchDataForUser } = useInfrastructure(user?.role === Role.ADMIN);
  const {
    summaryData, realtimeData, historicalData, usersList,
    loading, error, fetchSummary, fetchRealtimeData,
    fetchHistoricalData, fetchUsersList,
  } = useDashboard();
  
  const [settings, setSettings] = useState<Settings | null>(null);
  const [filters, setFilters] = useState<any>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!user) return;
    const initialFetch = async () => {
      if (user.role === Role.ADMIN) await fetchUsersList();
      setSettings(await getSettings());
    };
    initialFetch();
  }, [user]);
  
  useEffect(() => {
    const targetUserId = filters.userId || user?.id;
    if (targetUserId) fetchDataForUser(targetUserId);
  }, [filters.userId, user?.id]);

  useEffect(() => {
    if (tanks.length > 0 && !tanks.some(tank => tank.id === filters.tankId)) {
      setFilters(prev => ({ ...prev, tankId: tanks[0].id }));
    }
  }, [tanks]);

  useEffect(() => {
    if (filters.tankId) {
      fetchSummary(filters);
      fetchRealtimeData(filters);
      if (filters.startDate && filters.endDate) fetchHistoricalData(filters);
    }
  }, [filters]);

  useEffect(() => {
    if (!filters.tankId) return;
    const interval = setInterval(() => {
        fetchRealtimeData(filters, true);
        fetchSummary(filters, true);
    }, 15000);
    return () => clearInterval(interval);
  }, [filters]);

  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
  }, []);

  if (!user) return null;

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitoreo en tiempo real de tus sistemas acuapónicos.
          </p>
        </div>
      </div>
      {error && <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-6">{error}</div>}
      
      {/* FIX: Se pasa la variable correcta 'tanks' como la prop 'tanksList' */}
      <DashboardFilters
        filters={filters}
        onFiltersChange={handleFiltersChange} 
        usersList={usersList}
        tanksList={tanks}
        currentUserRole={user.role}
        loading={loading}
      />
      <SummaryCards data={summaryData} loading={loading} />
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Lecturas en Tiempo Real
        </h2>
        <GaugeChart data={realtimeData} settings={settings} loading={loading} />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Tendencias Históricas
        </h2>
        <LineChart data={historicalData} loading={loading} />
      </div>
    </div>
  );
};

export default DashboardPage;