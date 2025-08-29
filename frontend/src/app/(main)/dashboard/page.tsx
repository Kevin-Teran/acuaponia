/**
 * @file /src/app/(main)/dashboard/page.tsx
 * @description Página principal del dashboard que consume el hook useDashboard.
 * @author Kevin Mariano
 * @version 7.0.0
 */
'use client';

import React from 'react';
import { withAuth } from '@/hoc/withAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { SensorType } from '@/types';

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
  const { 
    loading, 
    users, 
    tanks, 
    filters, 
    handleFilterChange, 
    latestData, 
    historicalData,
    summary,
    currentUser
  } = useDashboard();

  return (
    <div className="container mx-auto p-4 md:p-6 text-gray-800 dark:text-white animate-in fade-in duration-500">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard de Monitoreo</h1>
      </header>

      {loading.base ? (
         <div className="flex justify-center my-8"><LoadingSpinner message="Cargando configuración inicial..." /></div>
      ) : (
        <DashboardFilters
          users={users}
          tanks={tanks}
          filters={filters}
          onFilterChange={handleFilterChange}
          isLoading={loading.data}
          currentUser={currentUser}
        />
      )}
      
      {loading.data && (
        <div className="flex justify-center my-8"><LoadingSpinner message="Cargando datos del dashboard..." /></div>
      )}

      {!loading.data && filters.tankId && (
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GaugeChart sensorType={SensorType.TEMPERATURE} value={latestData?.temperature} />
            <GaugeChart sensorType={SensorType.PH} value={latestData?.ph} />
            <GaugeChart sensorType={SensorType.OXYGEN} value={latestData?.oxygen} />
          </div>
          <SummaryCards summary={summary} />
          <LineChart
            data={historicalData}
            thresholds={defaultThresholds}
            startDate={filters.startDate}
            endDate={filters.endDate}
          />
        </div>
      )}

      {!loading.base && !filters.tankId && (
         <Card className="p-6 mt-6 text-center text-gray-500 dark:text-gray-400">
           <h3 className="text-lg font-semibold">No hay tanques para mostrar</h3>
           <p>El usuario seleccionado no tiene tanques asignados. Por favor, cree uno o seleccione otro usuario.</p>
         </Card>
      )}
    </div>
  );
};

export default withAuth(DashboardPageComponent, ['ADMIN', 'USER']);