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

import React, { useState, useEffect, useMemo } from 'react';
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
import { BrainCircuit } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { differenceInDays, parseISO } from 'date-fns';
import { sensorTypeTranslations } from '@/utils/translations';

const AnalyticsPage = () => {
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const isAdmin = currentUser?.role === Role.ADMIN;

  const { tanks, sensors, users, loading: isInfraLoading, fetchDataForUser } = useInfrastructure(isAdmin);
  const { loading: isAnalyticsLoading, kpis, timeSeriesData, alertsSummary, correlationData, fetchData } = useAnalytics();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTankId, setSelectedTankId] = useState('ALL');
  const [selectedSensorType, setSelectedSensorType] = useState(SensorType.TEMPERATURE);
  const [selectedSensorId, setSelectedSensorId] = useState('ALL');
  const [selectedRange, setSelectedRange] = useState('week');
  const [availableRanges, setAvailableRanges] = useState({ day: true, week: false, month: false, year: false });
  const [hasInitialData, setHasInitialData] = useState<boolean | null>(null);

  useEffect(() => {
    if (currentUser) {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedUserId) {
      fetchDataForUser(selectedUserId);
    }
  }, [selectedUserId, fetchDataForUser]);
  
  useEffect(() => {
    if (selectedUserId) {
      getDataDateRange({ userId: selectedUserId })
        .then(({ firstDataPoint }) => {
          if (firstDataPoint) {
            setHasInitialData(true);
            const daysDiff = differenceInDays(new Date(), parseISO(firstDataPoint));
            setAvailableRanges({
              day: true,
              week: daysDiff >= 1,
              month: daysDiff >= 7,
              year: daysDiff >= 30,
            });
          } else {
            setHasInitialData(false);
          }
        })
        .catch(error => {
          console.error("No se pudo determinar el rango de fechas:", error);
          setHasInitialData(false);
        });
    }
  }, [selectedUserId]);

  useEffect(() => {
    if (selectedUserId && hasInitialData !== null) {
      // Si se selecciona un sensor específico, su tipo anula la selección de tipo general
      const sensorTypeForQuery = selectedSensorId !== 'ALL' && sensors 
        ? sensors.find(s => s.id === selectedSensorId)?.type || selectedSensorType
        : selectedSensorType;

      fetchData({
        userId: selectedUserId,
        tankId: selectedTankId,
        sensorType: sensorTypeForQuery,
        sensorId: selectedSensorId,
        range: selectedRange,
      });
    }
  }, [selectedUserId, selectedTankId, selectedSensorId, selectedSensorType, selectedRange, hasInitialData, fetchData, sensors]);
  
  const availableSensors = useMemo(() => {
      if (!sensors) return [];
      if(selectedTankId === 'ALL') return sensors;
      return sensors.filter(s => s.tankId === selectedTankId);
  }, [sensors, selectedTankId]);


  if (isAuthLoading) { return <Skeleton className="w-full h-screen" />; }
  
  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 bg-slate-50 dark:bg-slate-900 min-h-full">
      <aside className="lg:w-1/4 xl:w-1/5 lg:sticky lg:top-6 h-fit">
        <AnalyticsControlPanel
          users={users || []}
          selectedUserId={selectedUserId}
          onUserChange={setSelectedUserId}
          isAdmin={isAdmin}
          tanks={tanks || []}
          selectedTankId={selectedTankId}
          onTankChange={setSelectedTankId}
          selectedSensorType={selectedSensorType}
          onSensorTypeChange={setSelectedSensorType}
          availableSensors={availableSensors}
          selectedSensorId={selectedSensorId}
          onSensorChange={setSelectedSensorId}
          availableRanges={availableRanges}
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          isLoading={isInfraLoading || isAnalyticsLoading.kpis}
        />
      </aside>
      <main className="flex-1 space-y-6">
        {hasInitialData === false ? (
          <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
            <BrainCircuit className="w-20 h-20 text-slate-400 mb-6" />
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Sin Datos para Analizar</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
              No se han encontrado datos históricos para el usuario seleccionado.
            </p>
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">
                Análisis Principal: <span className="font-bold text-green-600 dark:text-green-400">{sensorTypeTranslations[selectedSensorType]}</span>
              </h2>
              <KpiCards kpis={kpis} loading={isAnalyticsLoading.kpis} />
              <Card className="mt-6 shadow-md transition-shadow hover:shadow-lg">
                <TimeSeriesChart data={timeSeriesData} loading={isAnalyticsLoading.timeSeries} sensorType={selectedSensorType} />
              </Card>
            </section>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section>
                <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Correlación de Parámetros</h2>
                <Card className="shadow-md transition-shadow hover:shadow-lg">
                  <ParameterCorrelation data={correlationData} loading={isAnalyticsLoading.correlation} filters={{}}/>
                </Card>
              </section>
              <section>
                 <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-4">Resumen de Alertas</h2>
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