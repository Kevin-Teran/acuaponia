import { useState, useEffect, useCallback } from 'react';
import { SensorData, DataSummary, ProcessedDataPoint, SensorType } from '../types';
import { socketService } from '../services/socketService';
import api from '../config/api';

// --- Funciones de Utilidad ---

/**
 * @utility
 * @function processRawData
 * @description Transforma un array de lecturas individuales (formato raw de la API) en un array de puntos de datos consolidados por marca de tiempo.
 * Agrupa las lecturas de temperatura, pH y oxígeno que ocurren en el mismo intervalo de tiempo (10 segundos) en un único objeto.
 * @param {SensorData[]} rawData - Array de lecturas de sensor sin procesar.
 * @returns {ProcessedDataPoint[]} Array de puntos de datos procesados, listos para los gráficos.
 */
export const processRawData = (rawData: SensorData[]): ProcessedDataPoint[] => {
  const dataMap = new Map<string, ProcessedDataPoint>();
  const sortedData = [...rawData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  sortedData.forEach(item => {
      const groupTimestamp = new Date(Math.floor(new Date(item.timestamp).getTime() / 10000) * 10000).toISOString();
      if (!dataMap.has(groupTimestamp)) {
          dataMap.set(groupTimestamp, { timestamp: groupTimestamp, temperature: null, ph: null, oxygen: null });
      }
      const point = dataMap.get(groupTimestamp)!;
      const key = item.type.toLowerCase() as keyof Omit<ProcessedDataPoint, 'timestamp'>;
      if (key in point) {
          point[key] = item.value;
      }
  });

  return Array.from(dataMap.values());
};

/**
 * @utility
 * @function calculateDataSummary
 * @description Calcula estadísticas resumidas (mínimo, máximo, promedio, actual, anterior) a partir de los datos procesados.
 * @param {ProcessedDataPoint[]} data - Array de puntos de datos procesados.
 * @returns {DataSummary} Un objeto con las estadísticas para cada tipo de sensor.
 */
export const calculateDataSummary = (data: ProcessedDataPoint[]): DataSummary => {
  if (data.length === 0) return { temperature: { min: 0, max: 0, avg: 0, current: 0 }, ph: { min: 0, max: 0, avg: 0, current: 0 }, oxygen: { min: 0, max: 0, avg: 0, current: 0 } };

  const findLastValue = (key: keyof Omit<ProcessedDataPoint, 'timestamp'>, offset = 0) => {
      for (let i = data.length - 1 - offset; i >= 0; i--) {
          if (data[i][key] !== null && data[i][key] !== undefined) return data[i][key] as number;
      }
      return undefined;
  };

  const temps = data.map(d => d.temperature).filter((v): v is number => v !== null);
  const phs = data.map(d => d.ph).filter((v): v is number => v !== null);
  const oxygens = data.map(d => d.oxygen).filter((v): v is number => v !== null);

  return {
    temperature: { min: temps.length ? Math.min(...temps) : 0, max: temps.length ? Math.max(...temps) : 0, avg: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0, current: findLastValue('temperature') ?? 0, previous: findLastValue('temperature', 1) },
    ph: { min: phs.length ? Math.min(...phs) : 0, max: phs.length ? Math.max(...phs) : 0, avg: phs.length ? phs.reduce((a, b) => a + b, 0) / phs.length : 0, current: findLastValue('ph') ?? 0, previous: findLastValue('ph', 1) },
    oxygen: { min: oxygens.length ? Math.min(...oxygens) : 0, max: oxygens.length ? Math.max(...oxygens) : 0, avg: oxygens.length ? oxygens.reduce((a, b) => a + b, 0) / oxygens.length : 0, current: findLastValue('oxygen') ?? 0, previous: findLastValue('oxygen', 1) },
  };
};

// --- Hook Principal ---

/**
 * @interface SensorDataFilters
 * @description Define la estructura de los filtros que se pueden aplicar para obtener datos de sensores.
 */
interface SensorDataFilters {
  tankId: string | null;
  startDate: string;
  endDate: string;
  userId?: string | null;
}

/**
 * @hook useSensorData
 * @description Hook centralizado para obtener, procesar y actualizar los datos de los sensores.
 * Maneja la carga inicial de datos históricos vía API y las actualizaciones en tiempo real vía WebSockets.
 * @param {SensorDataFilters} filters - Los filtros a aplicar en la consulta de datos.
 * @returns Un objeto con los datos procesados, el resumen estadístico, el estado de carga y errores.
 */
export const useSensorData = (filters: SensorDataFilters) => {
  const { tankId, startDate, endDate, userId } = filters;
  const [rawData, setRawData] = useState<SensorData[]>([]);
  const [processedData, setProcessedData] = useState<ProcessedDataPoint[]>([]);
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  /**
   * @function fetchData
   * @description Realiza la llamada a la API para obtener los datos históricos según los filtros seleccionados.
   * Procesa los datos y actualiza los estados correspondientes.
   */
  const fetchData = useCallback(async () => {
    if (!tankId || !startDate || !endDate) {
      setLoading(false);
      return;
    };

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate);
      params.append('endDate', endDate);
      params.append('tankId', tankId);
      if (userId) params.append('userId', userId);
      
      const response = await api.get(`/data/historical?${params.toString()}`);
      const initialRawData: SensorData[] = response.data.data;

      setRawData(initialRawData);
      if (initialRawData && initialRawData.length > 0) {
        const processed = processRawData(initialRawData);
        setProcessedData(processed);
        setSummary(calculateDataSummary(processed));
        setLastUpdate(new Date());
      } else {
        setProcessedData([]);
        setSummary(calculateDataSummary([]));
      }
    } catch (err: any) {
      setError("No se pudieron cargar los datos históricos. Verifique la conexión o los filtros.");
    } finally {
      setLoading(false);
    }
  }, [tankId, startDate, endDate, userId]);

  useEffect(() => {
    fetchData();

    socketService.connect();
    const handleNewData = (newDataPoint: SensorData) => {
      if (newDataPoint.tankId === tankId) {
        setRawData(prevRawData => {
            const updatedRawData = [...prevRawData, newDataPoint].slice(-500);
            const processed = processRawData(updatedRawData);
            setProcessedData(processed);
            setSummary(calculateDataSummary(processed));
            setLastUpdate(new Date());
            return updatedRawData;
        });
      }
    };

    socketService.onSensorData(handleNewData);

    return () => {
      socketService.offSensorData(handleNewData);
      socketService.disconnect();
    };
  }, [fetchData, tankId]);

  return { 
    data: processedData, 
    summary, 
    loading, 
    error, 
    lastUpdate, 
    refreshData: fetchData 
  };
};