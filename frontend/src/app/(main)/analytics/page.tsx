/**
 * @file page.tsx
 * @route frontend/src/app/(main)/analytics/
 * @description Página de análisis de datos históricos con visualizaciones avanzadas.
 * @author kevin mariano
 * @version 2.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useInfrastructure } from '@/hooks/useInfrastructure';
import { useAnalytics } from '@/hooks/useAnalytics';
import { Card } from '@/components/common/Card';
import { AnalyticsControlPanel } from '@/components/analytics/AnalyticsControlPanel';
import { KpiCards } from '@/components/analytics/KpiCards';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { AlertsSummaryCharts } from '@/components/analytics/AlertsSummaryCharts';
import { ParameterCorrelation } from '@/components/analytics/ParameterCorrelation';
import { Role, SensorType } from '@/types';
import { subDays, format } from 'date-fns';
import { BrainCircuit } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';

const AnalyticsPage = () => {
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const isAdmin = currentUser?.role === 'ADMIN';
  
  const { tanks, usersList, loading: isInfraLoading, fetchDataForUser } = useInfrastructure(isAdmin);
  const { loading: isAnalyticsLoading, kpis, timeSeriesData, alertsSummary, correlationData, fetchData } = useAnalytics();

  // 1. Estado local para el ID de usuario seleccionado, igual que en tanks-and-sensors.
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    tankId: '',
    sensorType: SensorType.TEMPERATURE,
    sensorTypeX: SensorType.TEMPERATURE,
    sensorTypeY: SensorType.PH,
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // 2. Establece el usuario seleccionado cuando el usuario actual se carga.
  useEffect(() => {
    if (currentUser && !isAdmin) {
      setSelectedUserId(currentUser.id);
    }
    // Para el admin, selectedUserId empieza como null hasta que elija uno.
  }, [currentUser, isAdmin]);

  // 3. Llama a fetchDataForUser cuando el selectedUserId cambia.
  useEffect(() => {
    if (selectedUserId) {
      fetchDataForUser(selectedUserId);
    }
  }, [selectedUserId, fetchDataForUser]);

  // 4. Cuando los tanques se cargan, establece el primero por defecto.
  useEffect(() => {
    if (tanks && tanks.length > 0) {
      setFilters(prev => ({ ...prev, tankId: tanks[0].id }));
    } else {
      setFilters(prev => ({ ...prev, tankId: '' }));
    }
  }, [tanks]);

  // 5. Ejecuta el análisis de datos SÓLO cuando hay un tanque y un usuario seleccionados.
  useEffect(() => {
    if (filters.tankId && selectedUserId) {
      const fullFilters = { ...filters, userId: selectedUserId };
      fetchData(fullFilters);
    }
  }, [filters, selectedUserId, fetchData]);

  if (isAuthLoading) {
    return <Skeleton className="w-full h-screen" />;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 bg-slate-50 dark:bg-slate-900 min-h-full">
      <aside className="lg:w-1/4 xl:w-1/5 lg:sticky lg:top-6 h-fit">
        <AnalyticsControlPanel
          filters={filters} setFilters={setFilters} tanksList={tanks} usersList={usersList}
          currentUser={currentUser}
          selectedUserId={selectedUserId}
          onUserChange={setSelectedUserId}
          isLoading={isInfraLoading}
        />
      </aside>

      <main className="flex-1 space-y-6">
        {filters.tankId ? (
          <>
            <section>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
                Análisis Principal: <span className="font-bold text-indigo-600 dark:text-indigo-400">{filters.sensorType}</span>
              </h2>
              <KpiCards kpis={kpis} loading={isAnalyticsLoading.kpis} />
              <Card className="mt-6 shadow-md transition-shadow hover:shadow-lg">
                <TimeSeriesChart data={timeSeriesData} loading={isAnalyticsLoading.timeSeries} sensorType={filters.sensorType} />
              </Card>
            </section>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <section>
                  <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Correlación de Parámetros</h2>
                  <Card className="shadow-md transition-shadow hover:shadow-lg">
                    <ParameterCorrelation data={correlationData} loading={isAnalyticsLoading.correlation} filters={filters} />
                  </Card>
                </section>
                <section>
                   <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Resumen de Alertas</h2>
                   <AlertsSummaryCharts data={alertsSummary} loading={isAnalyticsLoading.alerts} />
                </section>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
            <BrainCircuit className="w-20 h-20 text-indigo-400 mb-6 animate-pulse" />
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Listo para Analizar</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
              {isInfraLoading ? 'Cargando datos...' : (isAdmin && !selectedUserId ? 'Por favor, selecciona un usuario desde el Panel de Control para empezar.' : 'Selecciona un tanque para visualizar los datos.')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AnalyticsPage;