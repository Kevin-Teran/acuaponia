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
import { User, Tank, ProcessedDataPoint, DataSummary, SensorData } from '../../types';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../config/api';
import { socketService } from '../../services/socketService';
import { calculateDataSummary, processRawData } from '../../hooks/useSensorData';

export const Dashboard: React.FC = () => {
  // --- Hooks de Estado y Contexto (Siempre en el nivel superior) ---
  const { user, loading: authLoading } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const today = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedTankId, setSelectedTankId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [users, setUsers] = useState<User[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loadingFilters, setLoadingFilters] = useState(true);

  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [chartData, setChartData] = useState<ProcessedDataPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // --- Hooks de Efectos y Memos (Siempre en el nivel superior) ---

  useEffect(() => {
    if (!user) return;
    setSelectedUserId(user.id);

    const fetchFilterData = async () => {
      try {
        setLoadingFilters(true);
        const [tanksData, usersData] = await Promise.all([
          tankService.getTanks(),
          isAdmin ? userService.getAllUsers() : Promise.resolve([]),
        ]);
        
        setTanks(tanksData);
        if (isAdmin) setUsers(usersData);
        
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

  const fetchChartData = useCallback(async () => {
    if (!selectedTankId || !startDate || !endDate) {
      setChartData([]);
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

  useEffect(() => {
    if (!selectedTankId) return;
    const initializeRealtime = async () => {
      try {
        const response = await api.get(`/data/latest?tankId=${selectedTankId}`);
        setSummary(response.data.data);
      } catch (error) { console.error("Error fetching latest data:", error); setSummary(null); }
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

  const filteredTanks = useMemo(() => {
    if (isAdmin && selectedUserId) return tanks.filter(tank => tank.userId === selectedUserId);
    return tanks;
  }, [tanks, selectedUserId, isAdmin]);

  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId);
    setSelectedTankId(null);
  };
  
  const { sampledChartData, chartLabels } = useMemo(() => {
    const dataLength = chartData.length;
    if (dataLength === 0) return { sampledChartData: [], chartLabels: [] };
    const diffDays = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24);
    let maxPoints = 150;
    if (diffDays > 30) maxPoints = 100;
    if (diffDays > 90) maxPoints = 60;
    const sampleInterval = Math.max(1, Math.floor(dataLength / maxPoints));
    const sampledData = chartData.filter((_, index) => index % sampleInterval === 0);
    let formatString = 'HH:mm';
    if (diffDays > 2) formatString = 'd MMM';
    if (diffDays > 90) formatString = 'MMM yy';
    const labels = sampledData.map(d => format(new Date(d.timestamp), formatString, { locale: es }));
    return { sampledChartData: sampledData, chartLabels: labels };
  }, [chartData, startDate, endDate]);
  
  const historicalSummary = useMemo(() => calculateDataSummary(chartData), [chartData]);

  const availableGauges = useMemo(() => {
    if (!summary) return [];
    const gauges = [];
    if (summary.temperature.current !== 0 || summary.temperature.previous !== undefined) {
        gauges.push({ key: 'temperature', label: 'Temperatura', unit: '°C', min: 15, max: 35, thresholds: { low: 20, high: 28 }, data: summary.temperature });
    }
    if (summary.ph.current !== 0 || summary.ph.previous !== undefined) {
        gauges.push({ key: 'ph', label: 'pH', unit: '', min: 6, max: 9, thresholds: { low: 6.8, high: 7.6 }, data: summary.ph });
    }
    if (summary.oxygen.current !== 0 || summary.oxygen.previous !== undefined) {
        gauges.push({ key: 'oxygen', label: 'Oxígeno Disuelto', unit: 'mg/L', min: 0, max: 15, thresholds: { low: 6, high: 10 }, data: summary.oxygen });
    }
    return gauges;
  }, [summary]);

  // --- Lógica de Renderizado ---
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
        onTankChange={setSelectedTankId} onUserChange={handleUserChange}
        tanks={filteredTanks} users={users} isAdmin={isAdmin}
      />

      {noTanksForSelectedUser ? (
        <Card><p className="text-center text-gray-500 py-10">Este usuario no tiene estanques asignados.</p></Card>
      ) : !selectedTankId ? (
        <Card><p className="text-center text-gray-500 py-10">Seleccione un estanque para ver los datos.</p></Card>
      ) : (
        <>
          <Card title="Valores Actuales" subtitle="Mediciones en tiempo real con indicadores de estado">
            {!summary ? <LoadingSpinner message="Cargando valores actuales..." /> : availableGauges.length > 0 ? (
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-8`}>
                {availableGauges.map(gauge => (
                  <GaugeChart
                    key={gauge.key}
                    value={gauge.data.current}
                    previousValue={gauge.data.previous}
                    min={gauge.min}
                    max={gauge.max}
                    label={gauge.label}
                    unit={gauge.unit}
                    thresholds={gauge.thresholds}
                  />
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No hay datos de sensores en tiempo real para este estanque.</p>
            )}
          </Card>

          <Card title="Tendencia Temporal" subtitle={`Mostrando datos desde ${startDate} hasta ${endDate}`}>
            {loadingChart ? <LoadingSpinner message="Cargando historial..." /> : 
              <LineChart data={sampledChartData} labels={chartLabels} height={350} />
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
