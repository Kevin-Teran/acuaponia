'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import SummaryCards from '@/components/dashboard/SummaryCards';
import LineChart from '@/components/dashboard/LineChart';
import GaugeChart from '@/components/dashboard/GaugeChart';
import DashboardFilters from '@/components/dashboard/DashboardFilters';
import AdminStatCards from '@/components/dashboard/AdminStatCards';
import { Tank, Sensor, SensorData, SensorType } from '@/types';
import { getTanks } from '@/services/tankService';
import { getSensorsByTank } from '@/services/sensorService';
import { getHistoricalData } from '@/services/dataService';
import { subDays } from 'date-fns';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedTankId, setSelectedTankId] = useState<string>('');
  const [selectedSensorId, setSelectedSensorId] = useState<string>('');
  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [loading, setLoading] = useState({
    filters: true,
    charts: false,
  });
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useMemo(() => user?.role === 'ADMIN', [user]);

  useEffect(() => {
    const fetchFilterData = async () => {
      setLoading(prevState => ({ ...prevState, filters: true }));
      setError(null);
      try {
        const tanksData = await getTanks();
        setTanks(tanksData);
        if (tanksData.length > 0) {
          const defaultTankId = tanksData[0].id;
          setSelectedTankId(defaultTankId);
          const sensorsData = await getSensorsByTank(defaultTankId);
          setSensors(sensorsData);
          if (sensorsData.length > 0) {
            setSelectedSensorId(sensorsData[0].id);
          }
        }
      } catch (err) {
        console.error('Error crítico al cargar datos para los filtros:', err);
        setError('No se pudieron cargar los datos iniciales. Por favor, recargue la página.');
      } finally {
        setLoading(prevState => ({ ...prevState, filters: false }));
      }
    };

    fetchFilterData();
  }, []);

  useEffect(() => {
    if (selectedTankId) {
      const fetchSensorsForTank = async () => {
        try {
          const sensorsData = await getSensorsByTank(selectedTankId);
          setSensors(sensorsData);
          setSelectedSensorId(sensorsData.length > 0 ? sensorsData[0].id : '');
        } catch (err) {
          console.error(`Error al cargar sensores para el tanque ${selectedTankId}:`, err);
          setSensors([]);
          setSelectedSensorId('');
        }
      };
      fetchSensorsForTank();
    }
  }, [selectedTankId]);

  useEffect(() => {
    if (selectedSensorId && dateRange.from && dateRange.to) {
      const fetchHistoricalData = async () => {
        setLoading(prevState => ({ ...prevState, charts: true }));
        try {
          const data = await getHistoricalData(
            selectedSensorId,
            dateRange.from.toISOString(),
            dateRange.to.toISOString()
          );
          setHistoricalData(data);
        } catch (err) {
          console.error(`Error al cargar datos históricos para el sensor ${selectedSensorId}:`, err);
          setHistoricalData([]);
        } finally {
          setLoading(prevState => ({ ...prevState, charts: false }));
        }
      };
      fetchHistoricalData();
    }
  }, [selectedSensorId, dateRange]);

  const selectedSensorType = useMemo(() => {
    return sensors.find(s => s.id === selectedSensorId)?.type;
  }, [sensors, selectedSensorId]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-gray-50/50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
      
      {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">{error}</div>}

      {isAdmin && <AdminStatCards />}

      <DashboardFilters
        tanks={tanks}
        sensors={sensors}
        selectedTankId={selectedTankId}
        selectedSensorId={selectedSensorId}
        onTankChange={setSelectedTankId}
        onSensorChange={setSelectedSensorId}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        isLoading={loading.filters}
      />

      <SummaryCards selectedTankId={selectedTankId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LineChart
            data={historicalData}
            sensorType={selectedSensorType}
            isLoading={loading.charts}
          />
        </div>
        <div className="space-y-6">
          <GaugeChart sensorType={SensorType.TEMPERATURE} tankId={selectedTankId} />
          <GaugeChart sensorType={SensorType.PH} tankId={selectedTankId} />
          <GaugeChart sensorType={SensorType.TDS} tankId={selectedTankId} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
