/**
 * @file /src/app/(main)/dashboard/page.tsx
 * @description Página principal del dashboard con filtros automáticos.
 * @author Kevin Mariano
 * @version 2.3.0
 */
'use client';

import React, { useState, useMemo } from 'react';
import { withAuth } from '@/hoc/withAuth';
import { useAuth } from '@/context/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import { useInfrastructure } from '@/hooks/useInfrastructure';
import { Role, SensorType, ProcessedDataPoint } from '@/types';
import { getHistoricalData } from '@/services/dataService';

import { GaugeChart } from '@/components/dashboard/GaugeChart';
import { LineChart } from '@/components/dashboard/LineChart';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import DashboardFilters from '@/components/dashboard/DashboardFilters';

import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Card } from '@/components/common/Card';

const defaultThresholds = {
  temperature: { min: 22, max: 28 },
  ph: { min: 6.5, max: 7.5 },
  oxygen: { min: 5, max: 9 },
};

const DashboardPageComponent = () => {
  const { user: currentUser } = useAuth();
  const { users, loading: usersLoading } = useUsers();
  const { tanks, loading: tanksLoading } = useInfrastructure();

  const [activeFilters, setActiveFilters] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<ProcessedDataPoint[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const visibleTanks = useMemo(() => {
    if (!currentUser || tanksLoading) return [];
    if (currentUser.role === Role.ADMIN) return tanks;
    return tanks.filter(tank => tank.userId === currentUser.id);
  }, [tanks, currentUser, tanksLoading]);

  const handleFiltersChange = async (newFilters: any) => {
    if (!newFilters.tankId) return;

    setActiveFilters(newFilters);
    setIsDataLoading(true);
    try {
      const data = await getHistoricalData(newFilters.tankId, newFilters.startDate, newFilters.endDate);
      setHistoricalData(data);
    } catch (error) {
      console.error("Error al obtener datos históricos:", error);
      setHistoricalData([]);
    } finally {
      setIsDataLoading(false);
    }
  };

  const isPageLoading = usersLoading || tanksLoading;

  // DEBUG: Para verificar si los tanques están llegando a la página.
  // Revisa la consola de tu navegador (F12) para ver este mensaje.
  if (!tanksLoading) {
    console.log("Tanques cargados:", tanks);
    console.log("Tanques visibles para el usuario:", visibleTanks);
  }

  return (
    <div className="container mx-auto p-4 md:p-6 text-gray-800 dark:text-white animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard de Monitoreo</h1>
      </header>

      {isPageLoading ? (
        <div className="flex justify-center my-8"><LoadingSpinner message="Cargando configuración..." /></div>
      ) : (
        <DashboardFilters
          users={users}
          tanks={visibleTanks}
          onFiltersChange={handleFiltersChange}
          isLoading={isDataLoading}
          currentUser={currentUser}
        />
      )}

      {isDataLoading && (
        <div className="flex justify-center my-8"><LoadingSpinner message="Cargando datos del dashboard..." /></div>
      )}

      {!isDataLoading && activeFilters && activeFilters.tankId && (
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GaugeChart sensorType={SensorType.TEMPERATURE} tankId={activeFilters.tankId} />
            <GaugeChart sensorType={SensorType.PH} tankId={activeFilters.tankId} />
            <GaugeChart sensorType={SensorType.TDS} tankId={activeFilters.tankId} />
          </div>
          <SummaryCards selectedTankId={activeFilters.tankId} />
          <LineChart
            data={historicalData}
            thresholds={defaultThresholds}
            startDate={activeFilters.startDate}
            endDate={activeFilters.endDate}
          />
        </div>
      )}

      {!isPageLoading && (!activeFilters || !activeFilters.tankId) && (
        <Card className="p-6 mt-6 text-center text-gray-500 dark:text-gray-400">
          <h3 className="text-lg font-semibold">No hay tanques para mostrar</h3>
          <p>Asegúrate de tener tanques asignados y de que se muestren en el filtro.</p>
        </Card>
      )}
    </div>
  );
};

export default withAuth(DashboardPageComponent, [Role.ADMIN, Role.USER]);