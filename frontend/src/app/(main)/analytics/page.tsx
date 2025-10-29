/**
 * @file page.tsx
 * @route frontend/src/app/(main)/analytics/
 * @description Página de análisis con layout corregido y balanceado - VERSIÓN FINAL CORREGIDA.
 * @author kevin mariano
 * @version 1.0.3
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useInfrastructure } from '@/hooks/useInfrastructure';
import { useAnalytics } from '@/hooks/useAnalytics';
import { getDataDateRange } from '@/services/analyticsService';
import * as settingsService from '@/services/settingsService'; // <-- Importar servicio de settings
import { Card } from '@/components/common/Card';
import { AnalyticsControlPanel } from '@/components/analytics/AnalyticsControlPanel';
import { KpiCards } from '@/components/analytics/KpiCards';
import { TimeSeriesChart } from '@/components/analytics/TimeSeriesChart';
import { AlertsSummaryCharts } from '@/components/analytics/AlertsSummaryCharts';
import { ParameterCorrelation } from '@/components/analytics/ParameterCorrelation';
import { Role, SensorType, Sensor, User as UserType, UserSettings } from '@/types'; // <-- Asegurar UserSettings
import { BrainCircuit, AlertCircle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { differenceInDays, parseISO, startOfDay, endOfDay, subDays, subMonths, subYears } from 'date-fns';
import { sensorTypeTranslations } from '@/utils/translations';

const AnalyticsPage = () => {
  const { user: currentUser, loading: isAuthLoading } = useAuth();
  const isAdmin = currentUser?.role === Role.ADMIN;

  const { tanks, sensors, users, loading: isInfraLoading, fetchDataForUser } = useInfrastructure(isAdmin);
  const { loading: isAnalyticsLoading, kpis, timeSeriesData, alertsSummary, correlationData, fetchData, error, resetState } = useAnalytics();

  // Estados de control
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTankId, setSelectedTankId] = useState('ALL');
  const [mainSensorType, setMainSensorType] = useState(SensorType.TEMPERATURE); 
  const [selectedSensorId, setSelectedSensorId] = useState('ALL');
  const [selectedRange, setSelectedRange] = useState('week');
  const [selectedStartDate, setSelectedStartDate] = useState<string | undefined>(undefined);
  const [selectedEndDate, setSelectedEndDate] = useState<string | undefined>(undefined);

  // **NUEVOS ESTADOS DE FILTROS GLOBALES**
  const [secondarySensorTypes, setSecondarySensorTypes] = useState<SensorType[]>([]); 
  const [samplingFactor, setSamplingFactor] = useState(1); 
  
  // **NUEVOS ESTADOS PARA CONFIGURACIÓN**
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

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
  
  // Efecto 1: Carga de settings y usuario
  useEffect(() => {
    if (currentUser?.id) {
        setSelectedUserId(currentUser.id);

        const loadSettings = async () => {
            setIsSettingsLoading(true);
            try {
                // Asumo que settingsService.getSettings() trae las UserSettings
                const settings = await settingsService.getSettings(); 
                setUserSettings(settings);
            } catch (e) {
                console.error('Error loading user settings for analytics:', e);
                setUserSettings(null);
            } finally {
                setIsSettingsLoading(false);
            }
        };
        loadSettings();
    }
  }, [currentUser?.id]);


  // Efecto 2: Validación de rango de datos e infraestructura
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
            if (!newRanges[selectedRange as keyof typeof newRanges]) setSelectedRange('week'); // Cambia a week o el máximo disponible
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
  
  // **NUEVA LÓGICA DE RANGO DE FECHAS**
  const currentRange = useMemo(() => {
    const now = new Date();
    let from = startOfDay(now);
    let to = endOfDay(now);

    switch (selectedRange) {
        case 'day':
            from = subDays(from, 1);
            break;
        case 'week':
            from = subDays(from, 7);
            break;
        case 'month':
            from = subMonths(from, 1);
            break;
        case 'year':
            from = subYears(from, 1);
            break;
        case 'custom':
             if (selectedStartDate) from = parseISO(selectedStartDate);
             if (selectedEndDate) to = parseISO(selectedEndDate);
             break;
        default:
            from = subDays(from, 7); // Default a week
    }

    return { from, to };
  }, [selectedRange, selectedStartDate, selectedEndDate]);


  // Efecto 3: Petición de datos de analíticas (usa currentRange para la petición)
  useEffect(() => {
    if (!selectedUserId || hasInitialData !== true || isSettingsLoading) return;
    
    const sensorTypeForQuery = sensors?.find(s => s.id === selectedSensorId)?.type || mainSensorType;
    
    // El servicio espera que las fechas sean strings ISO
    const startDateISO = currentRange.from.toISOString();
    const endDateISO = currentRange.to.toISOString();
    
    fetchData({
      userId: selectedUserId,
      tankId: selectedTankId,
      sensorId: selectedSensorId,
      sensorType: sensorTypeForQuery, 
      range: selectedRange,
      startDate: startDateISO, // <-- Se usan las fechas calculadas
      endDate: endDateISO, // <-- Se usan las fechas calculadas
      secondarySensorTypes: secondarySensorTypes.filter(type => type !== sensorTypeForQuery) as SensorType[], 
      samplingFactor: samplingFactor,
    });
  }, [selectedUserId, selectedTankId, selectedSensorId, mainSensorType, secondarySensorTypes, samplingFactor, selectedRange, currentRange, hasInitialData, sensors, fetchData, isSettingsLoading]);


  const availableSensors = useMemo(() => {
    if (!sensors) return [];
    if (selectedTankId === 'ALL') return sensors;
    return sensors.filter(s => s.tankId === selectedTankId);
  }, [sensors, selectedTankId]);

  const isLoading = isAuthLoading || isInfraLoading || dataRangeLoading || isSettingsLoading;
  const hasLoadingError = !isLoading && (!tanks || !sensors || (isAdmin && !users));

  const handleUserChange = useCallback((userId: string | null) => {
    resetState();
    setHasInitialData(null);
    setDataRangeLoading(true);
    setSelectedTankId('ALL');
    setSelectedSensorId('ALL');
    setSelectedRange('week');
    setSecondarySensorTypes([]); 
    setSamplingFactor(1); 
    setSelectedUserId(userId);
  }, [resetState]);

  const handleMainSensorTypeChange = useCallback((type: SensorType) => {
    setMainSensorType(type);
    setSelectedSensorId('ALL');
  }, []);
  
  const handleSecondarySensorTypesChange = useCallback((types: SensorType[]) => {
    setSecondarySensorTypes(types);
  }, []);

  const handleSamplingFactorChange = useCallback((factor: number) => {
    setSamplingFactor(factor);
  }, []);
  
  // Asumo que AnalyticsControlPanel debe tener un handler para custom range
  // handleDateRangeChange = (start: string, end: string) => { setSelectedStartDate(start); setSelectedEndDate(end); setSelectedRange('custom'); }


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
          selectedSensorType={mainSensorType} 
          onSensorTypeChange={handleMainSensorTypeChange}
          availableSensors={availableSensors}
          selectedSensorId={selectedSensorId}
          onSensorChange={setSelectedSensorId}
          availableRanges={availableRanges}
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          // Props de filtros globales
          secondarySensorTypes={secondarySensorTypes} 
          onSecondarySensorTypesChange={handleSecondarySensorTypesChange}
          samplingFactor={samplingFactor} 
          onSamplingFactorChange={handleSamplingFactorChange}
          isLoading={isLoading || isAnalyticsLoading.kpis}
          // Asumo que date range inputs también van en el control panel
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

        {!isLoading && hasInitialData === true && (
          <>
            {/* ... (Error y KPIs) */}

            <section className="space-y-6">

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                      Análisis Principal: <span className="text-green-600 dark:text-green-400">{sensorTypeTranslations[mainSensorType]}</span>
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

              {/* Contenedor de gráficos: Usa el nuevo LineChart avanzado */}
              <TimeSeriesChart
                data={timeSeriesData}
                loading={isAnalyticsLoading.timeSeries}
                mainSensorType={mainSensorType} 
                secondarySensorTypes={secondarySensorTypes} 
                samplingFactor={samplingFactor}
                userSettings={userSettings} // <-- Se pasa la configuración
                dateRange={currentRange} // <-- Se pasa el rango de fechas para el formato
              />

            </section>
            {/* ... (Correlación y Alertas) */}
          </>
        )}
      </main>
    </div>
  );
};

export default AnalyticsPage;