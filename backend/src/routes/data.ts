import express from 'express';
import { prisma } from '../config/database';
import { asyncHandler, CustomError } from '../middleware/errorHandler';
import { sensorValidation } from '../middleware/validation';
import { logger } from '../utils/logger';
import { sensorDataService } from '../services/sensorDataService';

const router = express.Router();

// GET /api/data/historical - Obtener datos históricos
router.get('/historical', asyncHandler(async (req, res) => {
  const { 
    sensorId, 
    tankId, 
    startDate, 
    endDate, 
    limit = 100, 
    offset = 0 
  } = req.query;

  const query = {
    sensorId: sensorId as string,
    tankId: tankId as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    limit: Number(limit),
    offset: Number(offset),
  };

  const sensorData = await sensorDataService.getSensorData(query);

  res.json({
    success: true,
    data: { sensorData }
  });
}));

// GET /api/data/statistics - Obtener estadísticas
router.get('/statistics', asyncHandler(async (req, res) => {
  const { sensorId, startDate, endDate } = req.query;

  if (!sensorId) {
    throw new CustomError('ID del sensor es requerido', 400);
  }

  const statistics = await sensorDataService.getSensorDataStatistics(
    sensorId as string,
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  res.json({
    success: true,
    data: { statistics }
  });
}));

// GET /api/data/realtime - Obtener datos en tiempo real
router.get('/realtime', asyncHandler(async (req, res) => {
  const { sensorIds } = req.query;

  let sensorIdArray: string[] = [];
  
  if (sensorIds) {
    sensorIdArray = Array.isArray(sensorIds) 
      ? sensorIds as string[]
      : (sensorIds as string).split(',');
  }

  const where: any = {};
  if (sensorIdArray.length > 0) {
    where.sensorId = { in: sensorIdArray };
  }

  // Obtener los últimos datos de cada sensor
  const latestData = await prisma.sensorData.findMany({
    where,
    include: {
      sensor: {
        select: {
          id: true,
          name: true,
          type: true,
        }
      },
      tank: {
        select: {
          id: true,
          name: true,
          location: true,
        }
      }
    },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });

  res.json({
    success: true,
    data: { latestData }
  });
}));

// POST /api/data/sensor-data - Crear datos de sensor (para ingreso manual)
router.post('/sensor-data', sensorValidation.data, asyncHandler(async (req, res) => {
  const { sensorId, temperature, ph, oxygen, timestamp } = req.body;

  const sensorData = await sensorDataService.createSensorData({
    sensorId,
    temperature,
    ph,
    oxygen,
    timestamp: timestamp ? new Date(timestamp) : undefined,
  });

  logger.info(`Datos de sensor creados manualmente: ${sensorId}`);

  res.status(201).json({
    success: true,
    data: { sensorData },
    message: 'Datos de sensor guardados exitosamente'
  });
}));

// GET /api/data/summary - Resumen de datos por período
router.get('/summary', asyncHandler(async (req, res) => {
  const { period = 'day', tankId } = req.query;

  let startDate: Date;
  const now = new Date();

  switch (period) {
    case 'hour':
      startDate = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const where: any = {
    timestamp: {
      gte: startDate,
      lte: now,
    }
  };

  if (tankId) {
    where.tankId = tankId;
  }

  const data = await prisma.sensorData.findMany({
    where,
    include: {
      sensor: {
        select: {
          id: true,
          name: true,
          type: true,
        }
      }
    },
    orderBy: { timestamp: 'desc' }
  });

  // Calcular estadísticas
  const summary = {
    totalRecords: data.length,
    period,
    startDate,
    endDate: now,
    byParameter: {
      temperature: {
        count: data.filter(d => d.temperature !== null).length,
        avg: data.reduce((sum, d) => sum + (d.temperature || 0), 0) / data.filter(d => d.temperature !== null).length || 0,
        min: Math.min(...data.map(d => d.temperature || Infinity).filter(t => t !== Infinity)),
        max: Math.max(...data.map(d => d.temperature || -Infinity).filter(t => t !== -Infinity)),
      },
      ph: {
        count: data.filter(d => d.ph !== null).length,
        avg: data.reduce((sum, d) => sum + (d.ph || 0), 0) / data.filter(d => d.ph !== null).length || 0,
        min: Math.min(...data.map(d => d.ph || Infinity).filter(p => p !== Infinity)),
        max: Math.max(...data.map(d => d.ph || -Infinity).filter(p => p !== -Infinity)),
      },
      oxygen: {
        count: data.filter(d => d.oxygen !== null).length,
        avg: data.reduce((sum, d) => sum + (d.oxygen || 0), 0) / data.filter(d => d.oxygen !== null).length || 0,
        min: Math.min(...data.map(d => d.oxygen || Infinity).filter(o => o !== Infinity)),
        max: Math.max(...data.map(d => d.oxygen || -Infinity).filter(o => o !== -Infinity)),
      }
    }
  };

  res.json({
    success: true,
    data: { summary, recentData: data.slice(0, 20) }
  });
}));

export default router;