import { SensorData, DataSummary, PredictionData } from '../types';

// Generar datos simulados para demostración
export const generateMockSensorData = (count: number = 20): SensorData[] => {
  const data: SensorData[] = [];
  const now = new Date();
  
  for (let i = count - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 30 * 1000); // Cada 30 segundos
    data.push({
      timestamp: timestamp.toISOString(),
      temperature: 24 + Math.sin(i * 0.1) * 3 + (Math.random() - 0.5) * 2,
      ph: 7.2 + Math.cos(i * 0.15) * 0.8 + (Math.random() - 0.5) * 0.3,
      oxygen: 8 + Math.sin(i * 0.12) * 2 + (Math.random() - 0.5) * 1,
    });
  }
  
  return data;
};

export const calculateDataSummary = (data: SensorData[]): DataSummary => {
  if (data.length === 0) {
    return {
      temperature: { min: 0, max: 0, avg: 0, current: 0 },
      ph: { min: 0, max: 0, avg: 0, current: 0 },
      oxygen: { min: 0, max: 0, avg: 0, current: 0 },
    };
  }

  const temps = data.map(d => d.temperature);
  const phs = data.map(d => d.ph);
  const oxygens = data.map(d => d.oxygen);
  
  return {
    temperature: {
      min: Math.min(...temps),
      max: Math.max(...temps),
      avg: temps.reduce((a, b) => a + b, 0) / temps.length,
      current: temps[temps.length - 1],
    },
    ph: {
      min: Math.min(...phs),
      max: Math.max(...phs),
      avg: phs.reduce((a, b) => a + b, 0) / phs.length,
      current: phs[phs.length - 1],
    },
    oxygen: {
      min: Math.min(...oxygens),
      max: Math.max(...oxygens),
      avg: oxygens.reduce((a, b) => a + b, 0) / oxygens.length,
      current: oxygens[oxygens.length - 1],
    },
  };
};

export const generatePredictionData = (currentValue: number, days: number = 7): PredictionData[] => {
  const data: PredictionData[] = [];
  const now = new Date();
  
  // Datos históricos (últimos 3 días)
  for (let i = 3; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const actual = currentValue + Math.sin(i * 0.5) * 2 + (Math.random() - 0.5) * 1;
    data.push({
      timestamp: timestamp.toISOString(),
      actual,
      predicted: actual + (Math.random() - 0.5) * 0.5, // Predicción cercana al valor real
    });
  }
  
  // Predicciones futuras
  for (let i = 1; i <= days; i++) {
    const timestamp = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
    const predicted = currentValue + Math.sin(i * 0.3) * 1.5 + (Math.random() - 0.5) * 0.8;
    data.push({
      timestamp: timestamp.toISOString(),
      predicted,
    });
  }
  
  return data;
};