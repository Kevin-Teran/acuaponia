import { useState, useEffect, useCallback } from 'react';
import { SensorData, DataSummary } from '../types';
import { socketService } from '../services/socketService';
import api from '../config/api';

interface ProcessedDataPoint {
  timestamp: string;
  temperature: number | null;
  ph: number | null;
  oxygen: number | null;
}

/**
 * @desc Transforma los datos normalizados del API a una estructura agrupada por timestamp.
 * @param {SensorData[]} rawData - Array de datos de sensores desde la API.
 * @returns {ProcessedDataPoint[]} Datos procesados para los gráficos.
 */
const processRawData = (rawData: SensorData[]): ProcessedDataPoint[] => {
    const dataMap = new Map<string, ProcessedDataPoint>();

    // Ordenar los datos crudos por timestamp para un procesamiento correcto
    const sortedData = [...rawData].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    sortedData.forEach(item => {
        // Agrupa lecturas que ocurren en el mismo intervalo de 10 segundos
        const groupTimestamp = new Date(Math.floor(new Date(item.timestamp).getTime() / 10000) * 10000).toISOString();
        
        if (!dataMap.has(groupTimestamp)) {
            dataMap.set(groupTimestamp, {
                timestamp: groupTimestamp,
                temperature: null,
                ph: null,
                oxygen: null,
            });
        }

        const point = dataMap.get(groupTimestamp)!;
        const key = item.type.toLowerCase() as keyof Omit<ProcessedDataPoint, 'timestamp'>;
        
        if (key in point) {
            point[key] = item.value;
        }
    });

    const processedData = Array.from(dataMap.values());
    
    for (let i = 1; i < processedData.length; i++) {
        if (processedData[i].temperature === null) processedData[i].temperature = processedData[i-1].temperature;
        if (processedData[i].ph === null) processedData[i].ph = processedData[i-1].ph;
        if (processedData[i].oxygen === null) processedData[i].oxygen = processedData[i-1].oxygen;
    }

    return processedData;
};


/**
 * @desc Calcula el resumen estadístico a partir de datos ya procesados.
 * @param {ProcessedDataPoint[]} data - Array de datos procesados.
 * @returns {DataSummary} Objeto con las estadísticas.
 */
export const calculateDataSummary = (data: ProcessedDataPoint[]): DataSummary => {
  if (data.length === 0) {
    return {
      temperature: { min: 0, max: 0, avg: 0, current: 0 },
      ph: { min: 0, max: 0, avg: 0, current: 0 },
      oxygen: { min: 0, max: 0, avg: 0, current: 0 },
    };
  }

  const findLastValue = (key: keyof Omit<ProcessedDataPoint, 'timestamp'>) => {
      for (let i = data.length - 1; i >= 0; i--) {
          if (data[i][key] !== null && data[i][key] !== undefined) {
              return data[i][key] as number;
          }
      }
      return 0;
  };

  const temps = data.map(d => d.temperature).filter((v): v is number => v !== null);
  const phs = data.map(d => d.ph).filter((v): v is number => v !== null);
  const oxygens = data.map(d => d.oxygen).filter((v): v is number => v !== null);
  
  return {
    temperature: {
      min: temps.length ? Math.min(...temps) : 0,
      max: temps.length ? Math.max(...temps) : 0,
      avg: temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0,
      current: findLastValue('temperature'),
    },
    ph: {
      min: phs.length ? Math.min(...phs) : 0,
      max: phs.length ? Math.max(...phs) : 0,
      avg: phs.length ? phs.reduce((a, b) => a + b, 0) / phs.length : 0,
      current: findLastValue('ph'),
    },
    oxygen: {
      min: oxygens.length ? Math.min(...oxygens) : 0,
      max: oxygens.length ? Math.max(...oxygens) : 0,
      avg: oxygens.length ? oxygens.reduce((a, b) => a + b, 0) / oxygens.length : 0,
      current: findLastValue('oxygen'),
    },
  };
};

/**
 * @hook useSensorData
 * @desc Hook para obtener datos de sensores en tiempo real.
 */
export const useSensorData = () => {
  const [rawData, setRawData] = useState<SensorData[]>([]); 
  const [processedData, setProcessedData] = useState<ProcessedDataPoint[]>([]);
  const [summary, setSummary] = useState<DataSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/data/historical?limit=300'); 
      const initialRawData: SensorData[] = response.data.data;

      if (initialRawData && initialRawData.length > 0) {
        setRawData(initialRawData);
        const processed = processRawData(initialRawData);
        setProcessedData(processed);
        setSummary(calculateDataSummary(processed));
        setLastUpdate(new Date());
      }
    } catch (err: any) {
      setError("No se pudieron cargar los datos históricos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
    socketService.connect();

    const handleNewData = (newDataPoint: SensorData) => {
        setRawData(prevRawData => {
            const updatedRawData = [...prevRawData, newDataPoint].slice(-300); 
            
            const processed = processRawData(updatedRawData);
            
            setProcessedData(processed);
            setSummary(calculateDataSummary(processed));
            setLastUpdate(new Date());

            return updatedRawData;
        });
    };

    socketService.onSensorData(handleNewData);

    return () => {
      socketService.disconnect();
    };
  }, [fetchInitialData]);

  const refreshData = useCallback(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  return { 
    data: processedData, 
    summary, 
    loading, 
    error, 
    lastUpdate, 
    refreshData 
  };
};