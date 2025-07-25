import { Server } from 'socket.io';
import SensorData from '../models/SensorData';
import Sensor from '../models/Sensor';
import { emitSensorData, emitCriticalAlert } from './socketService';

// Simulación de datos de sensores para desarrollo
export const startSensorSimulation = (io: Server) => {
  console.log('🔄 Iniciando simulación de sensores...');

  const generateSensorData = () => {
    const now = new Date();
    
    // Datos simulados para diferentes tipos de sensores
    const sensorTypes = [
      {
        type: 'temperature',
        value: 24 + Math.sin(Date.now() / 100000) * 3 + (Math.random() - 0.5) * 2,
        unit: '°C',
        thresholds: { min: 20, max: 28, critical: { min: 15, max: 35 } }
      },
      {
        type: 'ph',
        value: 7.2 + Math.cos(Date.now() / 120000) * 0.8 + (Math.random() - 0.5) * 0.3,
        unit: '',
        thresholds: { min: 6.8, max: 7.6, critical: { min: 6.0, max: 8.5 } }
      },
      {
        type: 'oxygen',
        value: 8 + Math.sin(Date.now() / 80000) * 2 + (Math.random() - 0.5) * 1,
        unit: 'mg/L',
        thresholds: { min: 6, max: 10, critical: { min: 4, max: 12 } }
      }
    ];

    return sensorTypes.map(sensor => {
      const quality = 
        sensor.value < sensor.thresholds.critical.min || sensor.value > sensor.thresholds.critical.max
          ? 'critical'
          : sensor.value < sensor.thresholds.min || sensor.value > sensor.thresholds.max
          ? 'warning'
          : 'good';

      return {
        sensorType: sensor.type,
        value: parseFloat(sensor.value.toFixed(2)),
        unit: sensor.unit,
        quality,
        timestamp: now,
        metadata: {
          batteryLevel: Math.floor(Math.random() * 30) + 70, // 70-100%
          signalStrength: Math.floor(Math.random() * 20) + 80, // 80-100%
          calibrationStatus: 'ok'
        }
      };
    });
  };

  // Emitir datos cada 30 segundos
  const interval = setInterval(() => {
    const sensorData = generateSensorData();
    
    // Emitir a todos los clientes conectados
    emitSensorData(io, {
      timestamp: new Date(),
      sensors: sensorData
    });

    // Verificar alertas críticas
    sensorData.forEach(data => {
      if (data.quality === 'critical') {
        emitCriticalAlert(io, {
          type: 'sensor_critical',
          sensorType: data.sensorType,
          value: data.value,
          unit: data.unit,
          timestamp: data.timestamp,
          message: `Valor crítico detectado en sensor de ${data.sensorType}: ${data.value}${data.unit}`
        });
      }
    });

    console.log(`📊 Datos de sensores emitidos: ${sensorData.length} sensores`);
  }, 30000); // 30 segundos

  // Limpiar intervalo al cerrar la aplicación
  process.on('SIGINT', () => {
    clearInterval(interval);
  });

  return interval;
};

// Función para obtener datos históricos
export const getHistoricalData = async (
  sensorType?: string,
  startDate?: Date,
  endDate?: Date,
  limit: number = 100
) => {
  try {
    const query: any = {};
    
    if (sensorType) {
      query.sensorType = sensorType;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const data = await SensorData.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('sensorId', 'name type')
      .populate('tankId', 'name location');

    return data;
  } catch (error) {
    console.error('Error obteniendo datos históricos:', error);
    throw error;
  }
};

// Función para calcular estadísticas
export const calculateStatistics = async (
  sensorType: string,
  startDate?: Date,
  endDate?: Date
) => {
  try {
    const matchStage: any = { sensorType };
    
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = startDate;
      if (endDate) matchStage.timestamp.$lte = endDate;
    }

    const stats = await SensorData.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          avg: { $avg: '$value' },
          min: { $min: '$value' },
          max: { $max: '$value' },
          count: { $sum: 1 },
          stdDev: { $stdDevPop: '$value' }
        }
      }
    ]);

    return stats[0] || {
      avg: 0,
      min: 0,
      max: 0,
      count: 0,
      stdDev: 0
    };
  } catch (error) {
    console.error('Error calculando estadísticas:', error);
    throw error;
  }
};