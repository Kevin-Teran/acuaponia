/**
 * @file page.tsx
 * @route frontend/src/app/(main)/analytics/
 * @description Página de análisis de datos históricos con visualizaciones avanzadas - VERSIÓN CORREGIDA.
 * @author kevin mariano
 * @version 3.0.0
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
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
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
  const [dataRangeLoading, setDataRangeLoading] = useState(false);

  /**
   * @function initializeUser
   * @description Inicializa el usuario seleccionado cuando se carga el contexto de autenticación
   */
  const initializeUser = useCallback(() => {
    if (currentUser && !selectedUserId) {
      console.log('🔧 [Analytics] Inicializando usuario:', currentUser.email);
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser, selectedUserId]);

  /**
   * @function loadInfrastructureData
   * @description Carga los datos de infraestructura para el usuario seleccionado
   */
  const loadInfrastructureData = useCallback(() => {
    if (selectedUserId && !isInfraLoading) {
      console.log('🏗️ [Analytics] Cargando infraestructura para usuario:', selectedUserId);
      fetchDataForUser(selectedUserId);
    }
  }, [selectedUserId, fetchDataForUser, isInfraLoading]);

  /**
   * @function validateDataAvailability
   * @description Valida la disponibilidad de datos y establece rangos disponibles
   */
  const validateDataAvailability = useCallback(async () => {
    if (!selectedUserId) return;

    console.log('🔍 [Analytics] Validando disponibilidad de datos para:', selectedUserId);
    setDataRangeLoading(true);

    try {
      const { firstDataPoint, lastDataPoint } = await getDataDateRange({ userId: selectedUserId });
      
      if (firstDataPoint && lastDataPoint) {
        console.log('✅ [Analytics] Datos encontrados desde:', firstDataPoint, 'hasta:', lastDataPoint);
        
        setHasInitialData(true);
        const daysDiff = differenceInDays(new Date(), parseISO(firstDataPoint));
        
        const newRanges = {
          day: true,
          week: daysDiff >= 1,
          month: daysDiff >= 7,
          year: daysDiff >= 30,
        };
        
        console.log('📅 [Analytics] Rangos disponibles:', newRanges);
        setAvailableRanges(newRanges);

        // Ajustar el rango seleccionado si no está disponible
        if (!newRanges[selectedRange as keyof typeof newRanges]) {
          const firstAvailable = Object.entries(newRanges).find(([_, available]) => available)?.[0] || 'day';
          console.log('⚠️ [Analytics] Ajustando rango a:', firstAvailable);
          setSelectedRange(firstAvailable);
        }
      } else {
        console.log('⚠️ [Analytics] No se encontraron datos para el usuario');
        setHasInitialData(false);
      }
    } catch (error) {
      console.error('❌ [Analytics] Error validando datos:', error);
      setHasInitialData(false);
    } finally {
      setDataRangeLoading(false);
    }
  }, [selectedUserId, selectedRange]);

  /**
   * @function loadAnalyticsData
   * @description Carga los datos de analíticas con los filtros actuales
   */
  const loadAnalyticsData = useCallback(() => {
    if (!selectedUserId || hasInitialData === null || hasInitialData === false) {
      console.log('⏸️ [Analytics] Saltando carga de analíticas:', { selectedUserId, hasInitialData });
      return;
    }

    // Determinar el tipo de sensor correcto
    let sensorTypeForQuery = selectedSensorType;
    
    // Si se selecciona un sensor específico, usar su tipo
    if (selectedSensorId !== 'ALL' && sensors) {
      const selectedSensor = sensors.find(s => s.id === selectedSensorId);
      if (selectedSensor) {
        sensorTypeForQuery = selectedSensor.type;
        console.log('🎯 [Analytics] Usando tipo de sensor específico:', sensorTypeForQuery);
      }
    }

    const filters = {
      userId: selectedUserId,
      tankId: selectedTankId !== 'ALL' ? selectedTankId : undefined,
      sensorType: sensorTypeForQuery,
      sensorId: selectedSensorId !== 'ALL' ? selectedSensorId : undefined,
      range: selectedRange,
    };

    console.log('📡 [Analytics] Cargando datos con filtros:', filters);
    fetchData(filters);
  }, [selectedUserId, selectedTankId, selectedSensorId, selectedSensorType, selectedRange, hasInitialData, sensors, fetchData]);

  // Computed values
  const availableSensors = useMemo(() => {
    if (!sensors) return [];
    if (selectedTankId === 'ALL') return sensors;
    return sensors.filter(s => s.tankId === selectedTankId);
  }, [sensors, selectedTankId]);

  const isLoading = isAuthLoading || isInfraLoading || dataRangeLoading;
  const hasLoadingError = !isLoading && (!tanks || !sensors || (isAdmin && !users));

  // Effects
  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  useEffect(() => {
    loadInfrastructureData();
  }, [loadInfrastructureData]);
  
  useEffect(() => {
    validateDataAvailability();
  }, [validateDataAvailability]);

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Cleanup en desmontaje
  useEffect(() => {
    return () => {
      resetState();
    };
  }, [resetState]);

  /**
   * @function handleUserChange
   * @description Maneja el cambio de usuario seleccionado
   */
  const handleUserChange = useCallback((userId: string | null) => {
    console.log('👤 [Analytics] Cambiando usuario a:', userId);
    
    // Reset estados
    resetState();
    setHasInitialData(null);
    setSelectedTankId('ALL');
    setSelectedSensorId('ALL');
    setSelectedRange('week');
    
    setSelectedUserId(userId);
  }, [resetState]);

  /**
   * @function handleFilterChange
   * @description Maneja cambios en los filtros que requieren recarga de datos
   */
  const handleTankChange = useCallback((tankId: string) => {
    console.log('🏗️ [Analytics] Cambiando tanque a:', tankId);
    setSelectedTankId(tankId);
    setSelectedSensorId('ALL'); // Reset sensor cuando cambia tanque
  }, []);

  const handleSensorChange = useCallback((sensorId: string) => {
    console.log('📡 [Analytics] Cambiando sensor a:', sensorId);
    setSelectedSensorId(sensorId);
  }, []);

  const handleSensorTypeChange = useCallback((sensorType: SensorType) => {
    console.log('🔬 [Analytics] Cambiando tipo de sensor a:', sensorType);
    setSelectedSensorType(sensorType);
  }, []);

  const handleRangeChange = useCallback((range: string) => {
    console.log('📅 [Analytics] Cambiando rango a:', range);
    setSelectedRange(range);
  }, []);

  // Early returns para estados de carga y error
  if (isAuthLoading) {
    return <Skeleton className="w-full h-screen" />;
  }

  if (hasLoadingError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
        <AlertCircle className="w-20 h-20 text-red-400 mb-6" />
        <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">Error de Carga</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
          No se pudo cargar la información necesaria para la página de analíticas.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 bg-slate-50 dark:bg-slate-900 min-h-full">
      {/* Panel de Control Lateral */}
      <aside className="lg:w-1/4 xl:w-1/5 lg:sticky lg:top-6 h-fit">
        <AnalyticsControlPanel
          users={users || []}
          selectedUserId={selectedUserId}
          onUserChange={handleUserChange}
          isAdmin={isAdmin}
          tanks={tanks || []}
          selectedTankId={selectedTankId}
          onTankChange={handleTankChange}
          selectedSensorType={selectedSensorType}
          onSensorTypeChange={handleSensorTypeChange}
          availableSensors={availableSensors}
          selectedSensorId={selectedSensorId}
          onSensorChange={handleSensorChange}
          availableRanges={availableRanges}
          selectedRange={selectedRange}
          onRangeChange={handleRangeChange}
          isLoading={isLoading || isAnalyticsLoading.kpis}
        />
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 space-y-6">
        {/* Estado de carga inicial */}
        {(isLoading || dataRangeLoading) && (
          <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
            <div className="animate-spin w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full mb-4"></div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Cargando Analíticas</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Preparando datos para el análisis...
            </p>
          </div>
        )}

        {/* Sin datos disponibles */}
        {!isLoading && hasInitialData === false && (
          <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 text-center">
            <BrainCircuit className="w-20 h-20 text-slate-400 mb-6" />
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Sin Datos para Analizar</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
              No se han encontrado datos históricos para el usuario seleccionado.
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-4">
              Los datos aparecerán aquí una vez que el sistema comience a recopilar información de los sensores.
            </p>
          </div>
        )}

        {/* Contenido Principal - Datos Disponibles */}
        {!isLoading && hasInitialData === true && (
          <>
            {/* Error de carga de analíticas */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-700 dark:text-red-300 font-medium">Error de Analíticas</p>
                </div>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
              </div>
            )}

            {/* Sección Principal de Análisis */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    Análisis Principal: <span className="text-green-600 dark:text-green-400">{sensorTypeTranslations[selectedSensorType]}</span>
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Período: {selectedRange === 'day' ? 'Hoy' : selectedRange === 'week' ? 'Última Semana' : selectedRange === 'month' ? 'Último Mes' : 'Último Año'}
                  </p>
                </div>
                
                {kpis && kpis.count > 0 && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {kpis.count.toLocaleString()} datos procesados
                    </span>
                  </div>
                )}
              </div>

              {/* KPI Cards */}
              <KpiCards kpis={kpis} loading={isAnalyticsLoading.kpis} />

              {/* Time Series Chart */}
              <Card className="mt-6 shadow-md transition-shadow hover:shadow-lg">
                <TimeSeriesChart 
                  data={timeSeriesData} 
                  loading={isAnalyticsLoading.timeSeries} 
                  sensorType={selectedSensorType} 
                />
              </Card>
            </section>

            {/* Grid de Análisis Secundarios */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Correlación de Parámetros */}
              <section>
                <Card className="shadow-md transition-shadow hover:shadow-lg">
                  <ParameterCorrelation 
                    data={correlationData} 
                    loading={isAnalyticsLoading.correlation} 
                    filters={{
                      userId: selectedUserId,
                      tankId: selectedTankId !== 'ALL' ? selectedTankId : undefined,
                      sensorId: selectedSensorId !== 'ALL' ? selectedSensorId : undefined,
                      range: selectedRange,
                    }}
                  />
                </Card>
              </section>

              {/* Resumen de Alertas */}
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