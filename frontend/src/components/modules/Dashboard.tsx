import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { Card } from '../common/Card';
import { GaugeChart } from '../dashboard/GaugeChart';
import { LineChart } from '../dashboard/LineChart';
import { SummaryCards } from '../dashboard/SummaryCards';
import { DashboardFilters } from '../dashboard/DashboardFilters';
import * as userService from '../../services/userService';
import * as tankService from '../../services/tankService';
import * as settingsService from '../../services/settingsService'; // Importar servicio de settings
import { User, Tank, ProcessedDataPoint, DataSummary, SensorData } from '../../types';
import { format, subDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../config/api';
import { socketService } from '../../services/socketService';
import { calculateDataSummary, processRawData } from '../../hooks/useSensorData';

/**
 * @component Dashboard
 * @description Componente principal del dashboard que orquesta los filtros,
 * la carga de datos históricos y en tiempo real, y la visualización de gráficos.
 * @returns {JSX.Element} El componente del dashboard.
 */
export const Dashboard: React.FC = () => {
  // --- Hooks de Estado y Contexto ---
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const today = new Date();
  const [startDate, setStartDate] = useState(format(subDays(today, 7), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(today, 'yyyy-MM-dd'));
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [settings, setSettings] = useState<any | null>(null); // Estado para almacenar settings
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [chartData, setChartData] = useState<ProcessedDataPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // --- Carga de Datos Inicial ---

  /**
   * Carga los datos necesarios para los filtros (usuarios, tanques y configuraciones).
   * Se ejecuta una vez al montar el componente o cuando cambia el usuario.
   */
  useEffect(() => {
    if (!user) return;
    setSelectedUserId(user.id);

    const fetchFilterData = async () => {
      try {
        setLoadingFilters(true);
        const [tanksData, usersData, settingsData] = await Promise.all([
          tankService.getTanks(),
          isAdmin ? userService.getAllUsers() : Promise.resolve([]),
          settingsService.getSettings(), // Cargar configuraciones
        ]);
        
        setTanks(tanksData);
        setSettings(settingsData);
        if (isAdmin) setUsers(usersData);
        
        // Auto-seleccionar el primer tanque del usuario actual si existe
        const tanksForUser = tanksData.filter(t => t.userId === user.id);
        if (tanksForUser.length > 0) {
          setSelectedTankId(tanksForUser[0].id);
        } else {
          setSelectedTankId(null);
        }
      } catch (error) { console.error("Error fetching filter data:", error); } 
      finally { setLoadingFilters(false); }
    };
    
    fetchFilterData();
  }, [user, isAdmin]);

  /**
   * Carga los datos históricos para los gráficos basado en los filtros seleccionados.
   * Se ejecuta cuando cambian los filtros de tanque o fecha.
   */
  const fetchChartData = useCallback(async () => {
    if (!selectedTankId || !startDate || !endDate) {
      setChartData([]);
      setLoadingChart(false);
      return;
    }
    setLoadingChart(true);
    try {
      const params = new URLSearchParams({ startDate, endDate, tankId: selectedTankId });
      if (isAdmin && selectedUserId) params.append('userId', selectedUserId);
      const response = await api.get(`/data/historical?${params.toString()}`);
      setChartData(processRawData(response.data.data));
    } catch (error) {
      console.error("Error fetching chart data:", error);
      setChartData([]);
    } finally { setLoadingChart(false); }
  }, [selectedTankId, selectedUserId, startDate, endDate, isAdmin]);

  useEffect(() => { fetchChartData(); }, [fetchChartData]);

  // --- Lógica de Tiempo Real (WebSockets) ---

  /**
   * Establece la conexión con Socket.IO para recibir datos en tiempo real
   * y actualiza el resumen de datos (gauges).
   */
  useEffect(() => {
    if (!selectedTankId) return;
    
    // Función para obtener el estado inicial del resumen
    const initializeRealtime = async () => {
      try {
        const response = await api.get(`/data/latest?tankId=${selectedTankId}`);
        setSummary(response.data.data);
      } catch (error) { 
        console.error("Error fetching latest data:", error); 
        setSummary(null); 
      }
    };

    initializeRealtime();
    socketService.connect();

    const handleNewData = (newDataPoint: SensorData) => {
      if (newDataPoint.tankId === selectedTankId) {
        setSummary(prevSummary => {
          if (!prevSummary) return null;
          const key = newDataPoint.type.toLowerCase() as keyof DataSummary;
          return { ...prevSummary, [key]: { ...prevSummary[key], previous: prevSummary[key].current, current: newDataPoint.value } };
        });
        setLastUpdate(new Date());
      }
    };

    socketService.onSensorData(handleNewData);
    
    return () => socketService.disconnect();
  }, [selectedTankId]);

  // --- Memos para Optimización ---

  const filteredTanks = useMemo(() => {
    if (isAdmin && selectedUserId) return tanks.filter(tank => tank.userId === selectedUserId);
    return tanks;
  }, [tanks, selectedUserId, isAdmin]);

  /**
   * @desc Realiza un muestreo inteligente de los datos del gráfico para optimizar el rendimiento.
   * Reduce la cantidad de puntos en rangos de tiempo largos para evitar la sobrecarga visual.
   * @returns {{sampledChartData: ProcessedDataPoint[], chartLabels: string[]}} Datos muestreados y etiquetas para el gráfico.
   */
  const { sampledChartData, chartLabels } = useMemo(() => {
    const dataLength = chartData.length;
    if (dataLength === 0) return { sampledChartData: [], chartLabels: [] };

    const diffDays = differenceInDays(new Date(endDate), new Date(startDate));
    
    // Lógica de muestreo inteligente
    let maxPoints = 200; // Por defecto para rangos cortos
    if (diffDays > 7) maxPoints = 150; // Una semana
    if (diffDays > 30) maxPoints = 100; // Un mes
    if (diffDays > 90) maxPoints = 60;  // Tres meses

    const sampleInterval = Math.max(1, Math.floor(dataLength / maxPoints));
    const sampledData = chartData.filter((_, index) => index % sampleInterval === 0);

    // Ajustar formato de fecha según el rango de tiempo
    let formatString = 'HH:mm';
    if (diffDays > 2) formatString = 'd MMM';
    if (diffDays > 90) formatString = 'MMM yy';
    
    const labels = sampledData.map(d => format(new Date(d.timestamp), formatString, { locale: es }));
    
    return { sampledChartData: sampledData, chartLabels: labels };
  }, [chartData, startDate, endDate]);
  
  const historicalSummary = useMemo(() => calculateDataSummary(chartData), [chartData]);

  // --- Renderizado ---

  if (authLoading || loadingFilters) {
    return <LoadingSpinner fullScreen message="Cargando configuración..." />;
  }
  
  const noTanksForSelectedUser = filteredTanks.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard de Monitoreo</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Visualización de variables acuáticas.</p>
        </div>
      </div>

      <DashboardFilters
        startDate={startDate} endDate={endDate} selectedTankId={selectedTankId}
        selectedUserId={selectedUserId} onStartDateChange={setStartDate} onEndDateChange={setEndDate}
        onTankChange={setSelectedTankId} onUserChange={setSelectedUserId}
        tanks={filteredTanks} users={users} isAdmin={isAdmin}
      />

      {noTanksForSelectedUser ? (
        <Card><p className="text-center text-gray-500 py-10">Este usuario no tiene estanques asignados.</p></Card>
      ) : !selectedTankId ? (
        <Card><p className="text-center text-gray-500 py-10">Seleccione un estanque para ver los datos.</p></Card>
      ) : (
        <>
          <Card title="Valores Actuales" subtitle="Mediciones en tiempo real con indicadores de estado">
            {!summary ? <LoadingSpinner message="Cargando valores actuales..." /> : (
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-8`}>
                <GaugeChart
                  value={summary.temperature.current}
                  previousValue={summary.temperature.previous}
                  min={15} max={35} label="Temperatura" unit="°C"
                  thresholds={settings?.thresholds?.temperature}
                />
                <GaugeChart
                  value={summary.ph.current}
                  previousValue={summary.ph.previous}
                  min={6} max={9} label="pH" unit=""
                  thresholds={settings?.thresholds?.ph}
                />
                <GaugeChart
                  value={summary.oxygen.current}
                  previousValue={summary.oxygen.previous}
                  min={0} max={15} label="Oxígeno Disuelto" unit="mg/L"
                  thresholds={settings?.thresholds?.oxygen}
                />
              </div>
            )}
          </Card>

          <Card title="Tendencia Temporal" subtitle={`Mostrando datos desde ${format(new Date(startDate), 'dd MMM yyyy', { locale: es })} hasta ${format(new Date(endDate), 'dd MMM yyyy', { locale: es })}`}>
            {loadingChart ? <LoadingSpinner message="Cargando historial..." /> : 
              <LineChart 
                data={sampledChartData} 
                labels={chartLabels} 
                thresholds={settings?.thresholds} // Pasar umbrales al gráfico
              />
            }
          </Card>

          {summary && historicalSummary && (
            <SummaryCards 
              summary={summary} 
              historicalSummary={historicalSummary}
              lastUpdate={lastUpdate} 
              onRefresh={fetchChartData} 
              loading={loadingChart}
            />
          )}
        </>
      )}
    </div>
  );
};