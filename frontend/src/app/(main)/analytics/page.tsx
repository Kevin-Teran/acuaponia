/**
 * @file page.tsx
 * @route frontend/src/app/(main)/analytics/
 * @description Página de análisis reorganizada con visualización condicional real
 * * MODIFICACIÓN: Se elimina la tarjeta de "Opciones de Tiempo y Muestreo" para simplificar la interfaz.
 * @author kevin mariano
 * @version 1.0.10
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useInfrastructure } from '@/hooks/useInfrastructure';
import { useAnalytics } from '@/hooks/useAnalytics';
import { getDataDateRange } from '@/services/analyticsService';
import * as settingsService from '@/services/settingsService';
import { Card } from '@/components/common/Card';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters'; 
import { KpiCards } from '@/components/analytics/KpiCards';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { AlertsSummaryCharts } from '@/components/analytics/AlertsSummaryCharts';
import { ParameterCorrelation } from '@/components/analytics/ParameterCorrelation';
import { Role, SensorType, UserSettings } from '@/types';
import { BrainCircuit, AlertCircle, CheckCircle, BarChart3, PieChart as PieChartIcon, TrendingUp, Database, Container, Activity } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { differenceInDays, parseISO, subDays, subMonths, subYears, startOfDay, endOfDay, format, differenceInHours, subHours } from 'date-fns';
import { sensorTypeTranslations } from '@/utils/translations';

const RANGES_MAP: { label: string, value: string }[] = [
    { label: 'Última Hora', value: 'hour' },
    { label: 'Último Día', value: 'day' },
    { label: 'Última Semana', value: 'week' },
    { label: 'Último Mes', value: 'month' },
    { label: 'Último Año', value: 'year' },
    { label: 'Rango Manual', value: 'custom' },
];

const AnalyticsPage = () => {
  const { user: currentUser, loading: isAuthLoading } = useAuth();
  const isAdmin = currentUser?.role === Role.ADMIN;

  const { loading: isAnalyticsLoading, kpis, timeSeriesData, alertsSummary, correlationData, fetchData, error, resetState } = useAnalytics();
  const { tanks, sensors, users, loading: isInfraLoading, fetchDataForUser, sensors: allSensorsList } = useInfrastructure(isAdmin);
  
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTankId, setSelectedTankId] = useState('ALL');
  const [mainSensorType, setMainSensorType] = useState<SensorType | undefined>(undefined); 
  const [selectedSensorId, setSelectedSensorId] = useState('ALL');
  
  const [selectedRange, setSelectedRange] = useState('hour'); 
  const [samplingFactor] = useState(1); // Muestreo ahora es fijo/automático
  
  const [selectedStartDate, setSelectedStartDate] = useState<string | undefined>(undefined);
  const [selectedEndDate, setSelectedEndDate] = useState<string | undefined>(undefined);
  const [secondarySensorTypes, setSecondarySensorTypes] = useState<SensorType[]>([]);
  
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [availableRanges, setAvailableRanges] = useState({ hour: true, day: false, week: false, month: false, year: false, custom: true });
  const [hasInitialData, setHasInitialData] = useState<boolean | null>(null);
  const [dataRangeLoading, setDataRangeLoading] = useState(true);

  const viewMode = useMemo(() => {
    if (selectedTankId === 'ALL' && !mainSensorType) return 'comparative'; 
    if (selectedTankId !== 'ALL' && !mainSensorType) return 'tank_detail'; 
    return 'sensor_detail'; 
  }, [selectedTankId, mainSensorType]);

  useEffect(() => {
    if (currentUser?.id) {
      setSelectedUserId(currentUser.id);
      
      const loadSettings = async () => {
        setIsSettingsLoading(true);
        try {
          const settings = await settingsService.getSettings();
          setUserSettings(settings);
        } catch (e) {
          console.error('Error loading user settings:', e);
          setUserSettings(null);
        } finally {
          setIsSettingsLoading(false);
        }
      };
      loadSettings();
    }
  }, [currentUser?.id]);

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
            const now = new Date();
            const firstDate = parseISO(firstDataPoint);
            
            const hoursDiff = differenceInHours(now, firstDate);
            const daysDiff = differenceInDays(now, firstDate);

            const newRanges = {
                hour: true, 
                day: hoursDiff >= 24, 
                week: daysDiff >= 7, 
                month: daysDiff >= 30, 
                year: daysDiff >= 365, 
                custom: true,
            };
            
            setAvailableRanges(newRanges);
            if (!newRanges[selectedRange as keyof typeof newRanges]) {
                setSelectedRange('hour'); 
            }
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

  const currentRange = useMemo(() => {
    const now = new Date();
    let from = startOfDay(now);
    let to = endOfDay(now);
    
    switch (selectedRange) {
      case 'hour': from = subHours(now, 1); to = now; break;
      case 'day': from = startOfDay(subDays(now, 1)); to = endOfDay(subDays(now, 1)); break;
      case 'week': from = subDays(startOfDay(now), 7); to = endOfDay(now); break;
      case 'month': from = subMonths(startOfDay(now), 1); to = endOfDay(now); break;
      case 'year': from = subYears(startOfDay(now), 1); to = endOfDay(now); break;
      case 'custom':
        if (selectedStartDate) from = parseISO(selectedStartDate);
        if (selectedEndDate) to = parseISO(selectedEndDate);
        break;
      default: from = subDays(startOfDay(now), 7); to = endOfDay(now);
    }
    return { from, to };
  }, [selectedRange, selectedStartDate, selectedEndDate]);

  // --- LÓGICA DE FILTROS CENTRALIZADOS ---
  const filtersState = useMemo(() => ({
    userId: selectedUserId,
    tankId: selectedTankId,
    sensorType: mainSensorType,
    range: selectedRange, 
    // Las fechas del filtro horizontal se basan en el rango actual solo si es custom o hour
    startDate: selectedRange !== 'custom' ? format(currentRange.from, 'yyyy-MM-dd') : selectedStartDate,
    endDate: selectedRange !== 'custom' ? format(currentRange.to, 'yyyy-MM-dd') : selectedEndDate,
  }), [selectedUserId, selectedTankId, mainSensorType, selectedRange, currentRange, selectedStartDate, selectedEndDate]);

  const handleFiltersChange = useCallback((newFilters: any) => {
    
    if (newFilters.startDate !== undefined || newFilters.endDate !== undefined) {
        setSelectedRange('custom');
    }

    if (newFilters.userId !== undefined && newFilters.userId !== selectedUserId) {
        setSelectedUserId(newFilters.userId);
        setSelectedTankId('ALL'); 
        setMainSensorType(undefined); 
    }

    if (newFilters.tankId !== undefined && newFilters.tankId !== selectedTankId) {
        setSelectedTankId(newFilters.tankId);
        setMainSensorType(undefined); 
    }

    if (newFilters.sensorType !== undefined) {
        setMainSensorType(newFilters.sensorType as SensorType || undefined);
    }
    
    if (newFilters.startDate !== undefined) setSelectedStartDate(newFilters.startDate);
    if (newFilters.endDate !== undefined) setSelectedEndDate(newFilters.endDate);

  }, [selectedUserId, selectedTankId]);
  
  const handleRangeChange = useCallback((range: string) => {
    setSelectedRange(range);
    // Limpiar fechas manuales si el usuario cambia a un rango preestablecido
    if (range !== 'custom') {
        setSelectedStartDate(undefined);
        setSelectedEndDate(undefined);
    }
  }, []);
  // --- FIN LÓGICA DE FILTROS CENTRALIZADOS ---

  useEffect(() => {
    if (!selectedUserId || hasInitialData !== true || isSettingsLoading) return;
    
    const sensorTypeForQuery = mainSensorType || SensorType.TEMPERATURE; 
    
    const baseFilters = {
        userId: selectedUserId,
        sensorType: sensorTypeForQuery, 
        samplingFactor: samplingFactor,
        secondarySensorTypes: secondarySensorTypes.filter(type => type !== sensorTypeForQuery) as SensorType[],
    };

    let dateFilters: { range?: string, startDate?: string, endDate?: string };

    // Si es custom o hour, enviamos fechas explícitas. Si no, enviamos la palabra clave del rango.
    if (selectedRange === 'custom' || selectedRange === 'hour') {
        dateFilters = {
            startDate: currentRange.from.toISOString(),
            endDate: currentRange.to.toISOString(),
        };
    } else {
        dateFilters = {
            range: selectedRange,
        };
    }

    // Construcción de filtros finales, omitiendo 'ALL' y asegurando la estructura de tiempo
    const finalFilters = {
        ...baseFilters,
        ...dateFilters,
        // Incluir tankId y sensorId solo si no son 'ALL'
        ...(selectedTankId !== 'ALL' && { tankId: selectedTankId }),
        ...(selectedSensorId !== 'ALL' && { sensorId: selectedSensorId }),
    };

    fetchData(finalFilters);
    
  }, [selectedUserId, selectedTankId, selectedSensorId, mainSensorType, secondarySensorTypes, samplingFactor, selectedRange, currentRange, hasInitialData, sensors, fetchData, isSettingsLoading]);

  const availableSensors = useMemo(() => {
    if (!sensors) return [];
    if (selectedTankId === 'ALL') return sensors;
    return sensors.filter(s => s.tankId === selectedTankId);
  }, [sensors, selectedTankId]);

  const isLoading = isAuthLoading || isInfraLoading || dataRangeLoading || isSettingsLoading;
  const hasLoadingError = !isLoading && (!tanks || !sensors || (isAdmin && !users));

  const tankStats = useMemo(() => {
    if (viewMode !== 'comparative' || !tanks || !sensors) return [];
    return tanks.map(tank => {
      const tankSensors = sensors.filter(s => s.tankId === tank.id);
      return {
        id: tank.id,
        name: tank.name,
        sensorsCount: tankSensors.length,
        temperature: tankSensors.filter(s => s.type === SensorType.TEMPERATURE).length,
        ph: tankSensors.filter(s => s.type === SensorType.PH).length,
        oxygen: tankSensors.filter(s => s.type === SensorType.OXYGEN).length,
      };
    });
  }, [viewMode, tanks, sensors]);

  const renderComparativeView = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <PieChartIcon className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Vista Comparativa</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Análisis general de todos los tanques</p>
          </div>
        </div>
      </div>

      {/* KPIs Generales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Total Tanques</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{tanks?.length || 0}</p>
            </div>
            <Container className="w-8 h-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Sensores Activos</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{sensors?.length || 0}</p>
            </div>
            <Activity className="w-8 h-8 text-green-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Alertas Recientes</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{kpis?.count ? Math.floor(kpis.count * 0.05) : 0}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Datos Totales</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{kpis?.count ? (kpis.count / 1000).toFixed(1) + 'K' : '0'}</p>
            </div>
            <Database className="w-8 h-8 text-purple-500" />
          </div>
        </Card>
      </div>

      {/* Tabla Comparativa de Tanques */}
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-green-600" />
          Distribución de Sensores por Tanque
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Tanque</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total Sensores</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Temperatura</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">pH</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Oxígeno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tankStats.map((tank, idx) => (
                <tr key={tank.id} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/30'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{tank.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900 dark:text-white font-bold">{tank.sensorsCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-blue-600 dark:text-blue-400">{tank.temperature}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-green-600 dark:text-green-400">{tank.ph}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-cyan-600 dark:text-cyan-400">{tank.oxygen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Resumen de Alertas */}
      {alertsSummary && <AlertsSummaryCharts data={alertsSummary} loading={isAnalyticsLoading.alerts} />}
    </div>
  );

  const renderTankDetailView = () => {
    const selectedTank = tanks?.find(t => t.id === selectedTankId);
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl">
              <Container className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                Análisis del Tanque: {selectedTank?.name || 'Cargando...'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Vista detallada con todos los sensores del tanque
              </p>
            </div>
          </div>
          {kpis && kpis.count > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg dark:bg-green-900/30">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                {kpis.count.toLocaleString()} datos procesados
              </span>
            </div>
          )}
        </div>

        <KpiCards kpis={kpis} loading={isAnalyticsLoading.kpis} />

        <TimeSeriesChart
          data={timeSeriesData}
          loading={isAnalyticsLoading.timeSeries}
          mainSensorType={mainSensorType || SensorType.TEMPERATURE} 
          secondarySensorTypes={secondarySensorTypes}
          samplingFactor={samplingFactor}
          userSettings={userSettings}
          dateRange={currentRange}
        />

        <ParameterCorrelation
          data={correlationData}
          loading={isAnalyticsLoading.correlation}
          filters={{
            userId: selectedUserId,
            tankId: selectedTankId,
            range: selectedRange,
            startDate: currentRange.from.toISOString(),
            endDate: currentRange.from.toISOString(),
          }}
        />
      </div>
    );
  };

  const renderSensorDetailView = () => {
    const selectedTank = tanks?.find(t => t.id === selectedTankId);
    
    const title = selectedTankId === 'ALL'
        ? `Análisis Global: ${sensorTypeTranslations[mainSensorType || SensorType.TEMPERATURE]}`
        : `Análisis del Sensor: ${selectedTank?.name || 'Cargando...'} - ${sensorTypeTranslations[mainSensorType || SensorType.TEMPERATURE]}`;
        
    const subtitle = selectedTankId === 'ALL'
        ? 'Comparativa de este parámetro en todos los tanques'
        : `Detalle del parámetro en el tanque seleccionado`;

    return (
      <div className="space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {title}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>

        <KpiCards kpis={kpis} loading={isAnalyticsLoading.kpis} />

        <TimeSeriesChart
          data={timeSeriesData}
          loading={isAnalyticsLoading.timeSeries}
          mainSensorType={mainSensorType || SensorType.TEMPERATURE}
          secondarySensorTypes={selectedTankId === 'ALL' ? [] : secondarySensorTypes}
          samplingFactor={samplingFactor}
          userSettings={userSettings}
          dateRange={currentRange}
        />
      </div>
    );
  };

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
    <> 
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analíticas de Datos</h1>
      <p className="text-lg text-slate-600 dark:text-slate-400"> 
        Visualiza métricas avanzadas, tendencias y correlaciones del sistema.
      </p>
      
      {/* ------------------------------------------------------------- */}
      {/* UBICACIÓN: Filtros Horizontales (Estilo Dashboard) */}
      <div className="mt-6">
        <AnalyticsFilters 
            filters={filtersState}
            onFiltersChange={handleFiltersChange}
            onRangeChange={handleRangeChange} // Pasamos el manejador de rango
            usersList={users || []}
            tanksList={tanks || []}
            currentUserRole={currentUser?.role}
            loading={isLoading}
            allSensorsList={allSensorsList || []}
            // Pasamos los estados de rango
            selectedRange={selectedRange}
            availableRanges={availableRanges}
            rangesMap={RANGES_MAP}
        />
      </div>
      {/* ------------------------------------------------------------- */}

      <main className="flex-1 space-y-6 mt-6"> 
        
        {/*
          SECCIÓN ELIMINADA:
          La tarjeta de Opciones de Tiempo y Muestreo fue eliminada según solicitud.
        */}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 p-8 text-center bg-white rounded-xl shadow-lg dark:bg-slate-800">
            <div className="w-16 h-16 mb-4 border-4 border-green-500 rounded-full animate-spin border-t-transparent"></div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Cargando Analíticas</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Preparando datos para el análisis...</p>
          </div>
        )}

        {error && !isLoading && (
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-3 p-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </Card>
        )}

        {!isLoading && hasInitialData === true && (
          <>
            {viewMode === 'comparative' && renderComparativeView()}
            {viewMode === 'tank_detail' && renderTankDetailView()}
            {viewMode === 'sensor_detail' && renderSensorDetailView()}
          </>
        )}

        {!isLoading && hasInitialData === false && (
          <Card className="p-12 text-center">
            <Database className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">No hay datos disponibles</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              Selecciona un usuario con datos registrados o espera a que se registren nuevas lecturas.
            </p>
          </Card>
        )}
      </main>
    </>
  );
};

export default AnalyticsPage;