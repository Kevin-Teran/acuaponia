/**
 * @file page.tsx
 * @route frontend/src/app/(main)/analytics/
 * @description Página principal de analíticas de datos. Utiliza un filtro unificado (estilo dashboard) y presenta la información en vistas segmentadas (Comparative, Tank Detail, Sensor Detail).
 * @author Kevin Mariano
 * @version 1.0.14
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
// Importación de los componentes de vista segmentados
import { ComparativeView } from '@/components/analytics/ComparativeView'; 
import { TankDetailView } from '@/components/analytics/TankDetailView'; 
import { SensorDetailView } from '@/components/analytics/SensorDetailView'; 

import { Role, SensorType, UserSettings } from '@/types';
import { AlertCircle, Database } from 'lucide-react';
import { Skeleton } from '@/components/common/Skeleton';
import { differenceInDays, parseISO, subDays, subMonths, subYears, startOfDay, endOfDay, format, differenceInHours, subHours } from 'date-fns';
import { sensorTypeTranslations } from '@/utils/translations';

// Definición de las constantes de rango 
const RANGES_MAP: { label: string, value: string }[] = [
    { label: 'Última Hora', value: 'hour' },
    { label: 'Último Día', value: 'day' },
    { label: 'Última Semana', value: 'week' },
    { label: 'Último Mes', value: 'month' },
    { label: 'Último Año', value: 'year' },
    { label: 'Rango Manual', value: 'custom' },
];

/**
 * @interface BaseViewProps
 * @description Define el conjunto mínimo de props necesarios para inyectar datos y estado a los componentes de vista segmentados.
 */
interface BaseViewProps {
    tanks: any;
    sensors: any;
    kpis: any;
    isAnalyticsLoading: any;
    timeSeriesData: any;
    alertsSummary: any;
    correlationData: any;
    userSettings: UserSettings | null;
    selectedUserId: string | null;
    selectedTankId: string;
    mainSensorType: SensorType | undefined;
    selectedRange: string;
    currentRange: { from: Date; to: Date };
    samplingFactor: number;
    sensorTypeTranslations: { [key in SensorType]: string };
    secondarySensorTypes: SensorType[]; // <--- CORRECCIÓN AÑADIDA
}

/**
 * @function AnalyticsPage
 * @description Componente principal de la página de Analíticas. Gestiona el estado de los filtros, 
 * la disponibilidad de datos históricos y la lógica de conmutación de vistas.
 * @returns {JSX.Element}
 */
const AnalyticsPage = () => {
  const { user: currentUser, loading: isAuthLoading } = useAuth();
  const isAdmin = currentUser?.role === Role.ADMIN;

  const { loading: isAnalyticsLoading, kpis, timeSeriesData, alertsSummary, correlationData, fetchData, error, resetState } = useAnalytics();
  const { tanks, sensors, users, loading: isInfraLoading, fetchDataForUser, sensors: allSensorsList } = useInfrastructure(isAdmin);
  
  // --- Estados de Filtro y UI ---
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTankId, setSelectedTankId] = useState('ALL');
  const [mainSensorType, setMainSensorType] = useState<SensorType | undefined>(undefined); 
  const [selectedSensorId] = useState('ALL'); 
  
  const [selectedRange, setSelectedRange] = useState('hour'); 
  const [samplingFactor] = useState(1); 
  
  const [selectedStartDate, setSelectedStartDate] = useState<string | undefined>(undefined);
  const [selectedEndDate, setSelectedEndDate] = useState<string | undefined>(undefined);
  const [secondarySensorTypes] = useState<SensorType[]>([]); // CORRECCIÓN: Se debe pasar a TankDetailView
  
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [availableRanges, setAvailableRanges] = useState({ hour: true, day: false, week: false, month: false, year: false, custom: true });
  const [hasInitialData, setHasInitialData] = useState<boolean | null>(true); // Asumir true para iniciar
  const [dataRangeLoading, setDataRangeLoading] = useState(false); // Asumir false para iniciar

  /**
   * @property {string} viewMode
   * @description Determina qué componente de vista debe renderizarse según los filtros seleccionados.
   */
  const viewMode = useMemo(() => {
    // 1. Vista Comparativa Global (Todos los Tanques + Sin Parámetro)
    if (selectedTankId === 'ALL' && !mainSensorType) return 'comparative'; 
    // 2. Vista Detalle de Tanque (Tanque Específico + Sin Parámetro)
    if (selectedTankId !== 'ALL' && !mainSensorType) return 'tank_detail'; 
    // 3. Vista de Detalle de Sensor/Parámetro (Global de Parámetro vs. Detalle de Sensor)
    return 'sensor_detail'; 
  }, [selectedTankId, mainSensorType]);

  // --- Efectos de Carga Inicial y Configuración ---

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

  /**
   * @function currentRange
   * @description Calcula las fechas exactas de inicio y fin (Date objects) basadas en el selectedRange.
   */
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

  /**
   * @property {object} filtersState
   * @description Objeto consolidado del estado de filtros, utilizado para pasar a AnalyticsFilters.
   */
  const filtersState = useMemo(() => ({
    userId: selectedUserId,
    tankId: selectedTankId,
    sensorType: mainSensorType,
    range: selectedRange, 
    startDate: selectedRange !== 'custom' ? format(currentRange.from, 'yyyy-MM-dd') : selectedStartDate,
    endDate: selectedRange !== 'custom' ? format(currentRange.to, 'yyyy-MM-dd') : selectedEndDate,
  }), [selectedUserId, selectedTankId, mainSensorType, selectedRange, currentRange, selectedStartDate, selectedEndDate]);

  // --- Manejadores de Interfaz y Estado ---

  /**
   * @function handleFiltersChange
   * @description Maneja los cambios en los selectores de Tanque, Usuario y Parámetro.
   */
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
  
  /**
   * @function handleRangeChange
   * @description Maneja el cambio en el selector de Rango (hour, week, custom, etc.).
   */
  const handleRangeChange = useCallback((range: string) => {
    setSelectedRange(range);
    if (range !== 'custom') {
        setSelectedStartDate(undefined);
        setSelectedEndDate(undefined);
    }
  }, []);

  /**
   * @function useEffect
   * @description Efecto principal para llamar a la API cuando los filtros cambian.
   */
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

    const finalFilters = {
        ...baseFilters,
        ...dateFilters,
        ...(selectedTankId !== 'ALL' && { tankId: selectedTankId }),
    };

    fetchData(finalFilters);
    
  }, [selectedUserId, selectedTankId, mainSensorType, secondarySensorTypes, samplingFactor, selectedRange, currentRange, hasInitialData, sensors, fetchData, isSettingsLoading]);

  // --- Propiedades y Cálculos Secundarios ---

  const tankStats = useMemo(() => {
    if (viewMode !== 'comparative' || !tanks || !sensors) return [];
    // Calcula las estadísticas para la vista comparativa (sensores por tanque)
    return tanks.map((tank: any) => {
      const tankSensors = sensors.filter((s: any) => s.tankId === tank.id);
      return {
        id: tank.id,
        name: tank.name,
        sensorsCount: tankSensors.length,
        temperature: tankSensors.filter((s: any) => s.type === SensorType.TEMPERATURE).length,
        ph: tankSensors.filter((s: any) => s.type === SensorType.PH).length,
        oxygen: tankSensors.filter((s: any) => s.type === SensorType.OXYGEN).length,
      };
    });
  }, [viewMode, tanks, sensors]);

  const isLoading = isAuthLoading || isInfraLoading || dataRangeLoading || isSettingsLoading;
  const hasLoadingError = !isLoading && (!tanks || !sensors || (isAdmin && !users));

  /**
   * @property {BaseViewProps} commonViewProps
   * @description Objeto que contiene todas las props necesarias para renderizar las vistas.
   */
  const commonViewProps: BaseViewProps = {
    tanks, sensors, kpis, isAnalyticsLoading, timeSeriesData, alertsSummary, correlationData, userSettings,
    selectedUserId, selectedTankId, mainSensorType, selectedRange, currentRange, samplingFactor, sensorTypeTranslations,
    secondarySensorTypes // CORRECCIÓN: Se incluye secondarySensorTypes
  };


  return (
    <> 
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Analíticas de Datos</h1>
      <p className="text-lg text-slate-600 dark:text-slate-400"> 
        Visualiza métricas avanzadas, tendencias y correlaciones del sistema.
      </p>
      
      {/* Filtros Horizontales */}
      <div className="mt-6">
        <AnalyticsFilters 
            filters={filtersState}
            onFiltersChange={handleFiltersChange}
            onRangeChange={handleRangeChange}
            usersList={users || []}
            tanksList={tanks || []}
            currentUserRole={currentUser?.role}
            loading={isLoading}
            allSensorsList={allSensorsList || []}
            selectedRange={selectedRange}
            availableRanges={availableRanges}
            rangesMap={RANGES_MAP}
        />
      </div>
      <main className="flex-1 space-y-6 mt-6"> 
        
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-64 p-8 text-center bg-white rounded-xl shadow-lg dark:bg-slate-800">
            {/* Si estás usando un componente de spinner personalizado (LoadingSpinner), úsalo aquí */}
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

        {/* Renderizado de Vistas Segmentadas */}
        {!isLoading && hasInitialData === true && (
          <>
            {viewMode === 'comparative' && <ComparativeView {...commonViewProps} tankStats={tankStats} />}
            {viewMode === 'tank_detail' && <TankDetailView {...commonViewProps} />}
            {viewMode === 'sensor_detail' && <SensorDetailView {...commonViewProps} />}
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