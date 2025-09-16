/**
 * @file page.tsx
 * @route frontend/src/app/(main)/analytics/
 * @description Página de análisis con layout corregido y balanceado - VERSIÓN FINAL.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useInfrastructure } from '@/hooks/useInfrastructure';
import { useAnalytics } from '@/hooks/useAnalytics';
import { getDataDateRange } from '@/services/analyticsService';
import { Card } from '@/components/common/Card';
import { AnalyticsControlPanel } from '@/components/analytics/AnalyticsControlPanel';
import { KpiCards } from '@/components/analytics/KpiCards';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { AlertsSummaryCharts } from '@/components/analytics/AlertsSummaryCharts';
import { ParameterCorrelation } from '@/components/analytics/ParameterCorrelation';
import { Role, SensorType, Sensor, User as UserType } from '@/types';
import { BrainCircuit, AlertCircle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { differenceInDays, parseISO } from 'date-fns';
import { sensorTypeTranslations } from '@/utils/translations';

const AnalyticsPage = () => {
  // SOLUCIÓN: Se cambia 'isLoading' por 'loading' para que coincida con el AuthContext.
  const { user: currentUser, loading: isAuthLoading } = useAuth();
  const isAdmin = currentUser?.role === Role.ADMIN;

  const { tanks, sensors, users, loading: isInfraLoading, fetchDataForUser } = useInfrastructure(isAdmin);
  const { loading: isAnalyticsLoading, kpis, timeSeriesData, alertsSummary, correlationData, fetchData, error, resetState } = useAnalytics();

  // Estados de control
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTankId, setSelectedTankId] = useState('ALL');
  const [selectedSensorType, setSelectedSensorType] = useState(SensorType.TEMPERATURE);
  const [selectedSensorId, setSelectedSensorId] = useState('ALL');
  const [selectedRange, setSelectedRange] = useState('week');

  // Estados de validación
  const [availableRanges, setAvailableRanges] = useState({
    day: true,
    week: false,
    month: false,
    year: false
  });
  const [hasInitialData, setHasInitialData] = useState<boolean | null>(null);
  const [dataRangeLoading, setDataRangeLoading] = useState(true);

  // --- Lógica de efectos para carga de datos ---
  useEffect(() => {
    if (currentUser && !selectedUserId) {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser, selectedUserId]);

  useEffect(() => {
    if (selectedUserId) {
      fetchDataForUser(selectedUserId);
      const validateData = async () => {
        setDataRangeLoading(true);
        setHasInitialData(null);
        try {
          const { firstDataPoint } = await getDataDateRange({ userId: selectedUserId });
          if (firstDataPoint) {
            setHasInitialData(true);
            const daysDiff = differenceInDays(new Date(), parseISO(firstDataPoint));
            const newRanges = { day: true, week: daysDiff >= 1, month: daysDiff >= 7, year: daysDiff >= 30 };
            setAvailableRanges(newRanges);
            if (!newRanges[selectedRange as keyof typeof newRanges]) setSelectedRange('day');
          } else {
            setHasInitialData(false);
          }
        } catch (err) {
          setHasInitialData(false);
        } finally {
          setDataRangeLoading(false);
        }
      };
      validateData();
    }
  }, [selectedUserId, fetchDataForUser]);

  useEffect(() => {
    if (!selectedUserId || hasInitialData !== true) return;
    const sensorTypeForQuery = sensors?.find(s => s.id === selectedSensorId)?.type || selectedSensorType;
    fetchData({
      userId: selectedUserId,
      tankId: selectedTankId,
      sensorId: selectedSensorId,
      sensorType: sensorTypeForQuery,
      range: selectedRange,
    });
  }, [selectedUserId, selectedTankId, selectedSensorId, selectedSensorType, selectedRange, hasInitialData, sensors, fetchData]);

  const availableSensors = useMemo(() => {
    if (!sensors) return [];
    if (selectedTankId === 'ALL') return sensors;
    return sensors.filter(s => s.tankId === selectedTankId);
  }, [sensors, selectedTankId]);

  const isLoading = isAuthLoading || isInfraLoading || dataRangeLoading;
  const hasLoadingError = !isLoading && (!tanks || !sensors || (isAdmin && !users));

  const handleUserChange = useCallback((userId: string | null) => {
    resetState();
    setHasInitialData(null);
    setDataRangeLoading(true);
    setSelectedTankId('ALL');
    setSelectedSensorId('ALL');
    setSelectedRange('week');
    setSelectedUserId(userId);
  }, [resetState]);

  // --- Renderizado del componente ---
  if (isAuthLoading) return <Skeleton className="w-full h-screen" />;

  if (hasLoadingError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white rounded-xl shadow-lg dark:bg-slate-800">
        <AlertCircle className="w-20 h-20 mb-6 text-red-400" />
        <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">Error de Carga</h3>
        <p className="max-w-sm mt-2 text-slate-500 dark:text-slate-400">No se pudo cargar la información necesaria.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 min-h-full lg:flex-row md:p-6 bg-slate-50 dark:bg-slate-900">
      <aside className="lg:w-1/4 xl:w-1/5 lg:sticky lg:top-6 h-fit">
        <AnalyticsControlPanel
          users={users || []}
          selectedUserId={selectedUserId}
          onUserChange={handleUserChange}
          isAdmin={isAdmin}
          tanks={tanks || []}
          selectedTankId={selectedTankId}
          onTankChange={(id) => { setSelectedTankId(id); setSelectedSensorId('ALL'); }}
          selectedSensorType={selectedSensorType}
          onSensorTypeChange={setSelectedSensorType}
          availableSensors={availableSensors}
          selectedSensorId={selectedSensorId}
          onSensorChange={setSelectedSensorId}
          availableRanges={availableRanges}
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          isLoading={isLoading || isAnalyticsLoading.kpis}
        />
      </aside>

      <main className="flex-1 space-y-6">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 p-8 text-center bg-white rounded-xl shadow-lg dark:bg-slate-800">
            <div className="w-16 h-16 mb-4 border-4 border-green-500 rounded-full animate-spin border-t-transparent"></div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Cargando Analíticas</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Preparando datos para el análisis...</p>
          </div>
        )}

        {!isLoading && hasInitialData === false && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white rounded-xl shadow-lg dark:bg-slate-800">
            <BrainCircuit className="w-20 h-20 mb-6 text-slate-400" />
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Sin Datos para Analizar</h3>
            <p className="max-w-sm mt-2 text-slate-500 dark:text-slate-400">No se han encontrado datos históricos para el usuario seleccionado.</p>
          </div>
        )}

        {!isLoading && hasInitialData === true && (
          <>
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="font-medium text-red-700 dark:text-red-300">Error de Analíticas</p>
                </div>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <section className="space-y-6">

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                      Análisis Principal: <span className="text-green-600 dark:text-green-400">{sensorTypeTranslations[selectedSensorType]}</span>
                    </h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Período: {selectedRange}
                    </p>
                  </div>
                  {kpis && kpis.count > 0 && (
                      <div className="mt-2 sm:mt-0 flex items-center justify-center gap-2 px-3 py-2 bg-green-100 rounded-lg dark:bg-green-900/30">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-300">
                          {kpis.count.toLocaleString()} datos procesados
                        </span>
                      </div>
                    )}
                </div>
                <KpiCards kpis={kpis} loading={isAnalyticsLoading.kpis} />
              </div>

              <Card className="shadow-md transition-shadow hover:shadow-lg">
                <TimeSeriesChart
                  data={timeSeriesData}
                  loading={isAnalyticsLoading.timeSeries}
                  sensorType={selectedSensorType}
                />
              </Card>
            </section>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section>
                <Card className="shadow-md transition-shadow hover:shadow-lg">
                  <ParameterCorrelation
                    data={correlationData}
                    loading={isAnalyticsLoading.correlation}
                    filters={{
                      userId: selectedUserId,
                      tankId: selectedTankId,
                      sensorId: selectedSensorId,
                      range: selectedRange,
                    }}
                  />
                </Card>
              </section>
              <section>
                <h2 className="mb-4 text-xl font-semibold text-slate-800 dark:text-slate-200">Resumen de Alertas</h2>
                <AlertsSummaryCharts data={alertsSummary} loading={isAnalyticsLoading.alerts} />
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AnalyticsPage;