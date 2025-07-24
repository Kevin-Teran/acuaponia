import { useState, useEffect } from 'react';
import { SensorData, DataSummary } from '../types';
import { generateMockSensorData, calculateDataSummary } from '../utils/mockData';

export const useSensorData = () => {
  const [data, setData] = useState<SensorData[]>([]);
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const updateData = () => {
    const newData = generateMockSensorData(50);
    setData(newData);
    setSummary(calculateDataSummary(newData));
    setLastUpdate(new Date());
    setLoading(false);
  };

  useEffect(() => {
    // Carga inicial
    updateData();

    // Actualización cada 30 segundos
    const interval = setInterval(updateData, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    data,
    summary,
    loading,
    lastUpdate,
    refreshData: updateData,
  };
};