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
import { useTanks } from '@/hooks/useTanks';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { GaugeChart } from '@/components/dashboard/GaugeChart';
import { LineChart } from '@/components/dashboard/LineChart';
import { Role } from '@/types';
import { RefreshCw } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const { tanks } = useTanks();
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
    fetchUsersList
  } = useDashboard();

  const [filters, setFilters] = useState<{
    userId?: string;
    tankId?: string;
    sensorType?: any;
    startDate?: string;
    endDate?: string;
  }>({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [autoRefresh, setAutoRefresh] = useState(true);

  // Cargar datos iniciales
  useEffect(() => {
    fetchSummary(filters);
    fetchRealtimeData(filters);
    if (filters.startDate && filters.endDate) {
      fetchHistoricalData(filters);
    }
    if (user?.role === Role.ADMIN) {
      fetchUsersList();
    }
  }, [filters, user?.role]);

  // Auto-refresh para datos en tiempo real
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchRealtimeData(filters);
      fetchSummary(filters);
    }, 10000); // Refresh cada 10 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, filters, fetchRealtimeData, fetchSummary]);

  const handleFiltersChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  const handleManualRefresh = useCallback(() => {
    fetchSummary(filters);
    fetchRealtimeData(filters);
    if (filters.startDate && filters.endDate) {
      fetchHistoricalData(filters);
    }
  }, [filters, fetchSummary, fetchRealtimeData, fetchHistoricalData]);

  // Filtrar tanques según el usuario seleccionado
  const filteredTanks = React.useMemo(() => {
    if (user?.role === Role.ADMIN && filters.userId) {
      return tanks.filter(tank => tank.user?.id === filters.userId);
    }
    return tanks;
  }, [tanks, filters.userId, user?.role]);

  if (!user) return null;

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitoreo en tiempo real de tus sistemas acuapónicos
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-[#39A900] text-white rounded-lg hover:bg-[#2F8B00] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 dark:bg-red-900/50 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Filtros */}
      <DashboardFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        usersList={usersList}
        tanksList={filteredTanks}
        currentUserRole={user.role}
        loading={loading}
      />

      {/* Tarjetas de Resumen */}
      <SummaryCards data={summaryData} loading={loading} />

      {/* Datos en Tiempo Real - Gauges */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Lecturas en Tiempo Real
        </h2>
        <GaugeChart data={realtimeData} loading={loading} />
      </div>

      {/* Datos Históricos - Gráfico de Líneas */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Tendencias Históricas
        </h2>
        <LineChart data={historicalData} loading={loading} />
      </div>
    </div>
  );
};

export default DashboardPage;