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
import { Activity } from 'lucide-react';

const AnalyticsPage = () => {
  const { user } = useAuth();
  // El hook ahora se inicializa sabiendo si debe comportarse como admin
  const { tanks, usersList, fetchDataForUser, isInfraLoading } = useInfrastructure(user?.role === Role.ADMIN);
  
  const {
    loading,
    kpis,
    timeSeriesData,
    alertsSummary,
    correlationData,
    fetchData,
  } = useAnalytics();

  const [filters, setFilters] = useState({
    userId: '',
    tankId: '',
    sensorType: SensorType.TEMPERATURE,
    sensorTypeX: SensorType.TEMPERATURE,
    sensorTypeY: SensorType.PH,
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // 1. Establece el usuario a consultar tan pronto como la información del usuario esté disponible.
  useEffect(() => {
    if (user) {
      // Si el usuario es ADMIN, no seleccionamos a nadie por defecto.
      // Si NO es admin, su ID se convierte en el filtro principal.
      const targetUserId = user.role === Role.ADMIN ? '' : user.id;
      setFilters(prev => ({ ...prev, userId: targetUserId }));
      // Llama a fetchDataForUser para cargar los tanques del usuario NO-ADMIN
      if (targetUserId) {
        fetchDataForUser(targetUserId);
      }
    }
  }, [user, fetchDataForUser]);

  // 2. Si el usuario es ADMIN y SELECCIONA un usuario, cargamos los tanques de ese usuario.
  const handleUserChangeForAdmin = useCallback((userId: string) => {
    setFilters(prev => ({ ...prev, userId: userId, tankId: '' })); // Resetea el tanque
    if (userId) {
      fetchDataForUser(userId);
    }
  }, [fetchDataForUser]);

  // 3. Cuando la lista de tanques (tanks) cambia, selecciona el primero por defecto.
  useEffect(() => {
    if (tanks && tanks.length > 0) {
      setFilters(prev => ({ ...prev, tankId: prev.tankId || tanks[0].id }));
    }
  }, [tanks]);

  // 4. Dispara el análisis de datos SÓLO cuando tenemos un usuario y un tanque seleccionados.
  useEffect(() => {
    if (filters.userId && filters.tankId) {
      fetchData(filters);
    }
  }, [filters, fetchData]);

  const isReadyForAnalysis = filters.userId && filters.tankId;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-6 p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-full">
      {/* Columna de Control Izquierda */}
      <aside className="lg:col-span-1 xl:col-span-1">
        <AnalyticsControlPanel
          filters={filters}
          setFilters={setFilters}
          tanksList={tanks}
          usersList={usersList}
          currentUser={user}
          onAdminUserChange={handleUserChangeForAdmin}
          isLoading={isInfraLoading}
        />
      </aside>

      {/* Contenido Principal Derecha */}
      <main className="lg:col-span-3 xl:col-span-4 space-y-6">
        {isReadyForAnalysis ? (
          <>
            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Análisis de Parámetro Principal: <span className="text-blue-600 dark:text-blue-400">{filters.sensorType}</span>
              </h2>
              <KpiCards kpis={kpis} loading={loading.kpis} />
              <Card className="mt-6">
                <TimeSeriesChart
                  data={timeSeriesData}
                  loading={loading.timeSeries}
                  sensorType={filters.sensorType}
                />
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Correlación de Parámetros</h2>
              <Card>
                <ParameterCorrelation 
                  data={correlationData}
                  loading={loading.correlation}
                  filters={filters}
                />
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Resumen de Alertas del Periodo</h2>
              <AlertsSummaryCharts data={alertsSummary} loading={loading.alerts} />
            </section>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-gray-800 rounded-lg p-8">
            <Activity className="w-16 h-16 text-blue-500 mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Selecciona para comenzar</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-center">
              {user?.role === Role.ADMIN ? 'Por favor, selecciona un usuario y un tanque en el panel de control para iniciar el análisis.' : 'Por favor, selecciona un tanque para iniciar el análisis.'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default AnalyticsPage;