import express, { Request, Response } from 'express';
import { prisma } from '../config/database';
import { asyncHandler, CustomError } from '../middleware/errorHandler';
import { sensorValidation } from '../middleware/validation';
import { logger } from '../utils/logger';
import { SensorStatus, SensorType } from '@prisma/client';

const router = express.Router();

// GET /api/sensors - Listar sensores
router.get('/', sensorValidation.query, asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, type, status, tankId } = req.query;
  
  const where: any = {};
  
  if (type) where.type = type as SensorType;
  if (status) where.status = status as SensorStatus;
  if (tankId) where.tankId = tankId as string;

  const [sensors, total] = await Promise.all([
    prisma.sensor.findMany({
      where,
      include: {
        tank: {
          select: {
            id: true,
            name: true,
            location: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
    }),
    prisma.sensor.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      sensors,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// POST /api/sensors - Crear sensor
router.post('/', sensorValidation.create, asyncHandler(async (req: Request, res: Response) => {
  const { name, type, location, tankId, calibrationDate } = req.body;

  // Verificar que el tanque existe
  const tank = await prisma.tank.findUnique({
    where: { id: tankId }
  });

  if (!tank) {
    throw new CustomError('Tanque no encontrado', 404);
  }

  const sensor = await prisma.sensor.create({
    data: {
      name,
      type: type as SensorType,
      location,
      tankId,
      calibrationDate: new Date(calibrationDate),
    },
    include: {
      tank: {
        select: {
          id: true,
          name: true,
          location: true,
        }
      }
    }
  });

  logger.info(`Sensor creado: ${sensor.name} en ${tank.name}`);

  res.status(201).json({
    success: true,
    data: { sensor },
    message: 'Sensor creado exitosamente'
  });
}));

// PUT /api/sensors/:id - Actualizar sensor
router.put('/:id', sensorValidation.update, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, location, status, batteryLevel, calibrationDate } = req.body;

  const updateData: any = {};
  
  if (name) updateData.name = name;
  if (location) updateData.location = location;
  if (status) updateData.status = status as SensorStatus;
  if (batteryLevel !== undefined) updateData.batteryLevel = batteryLevel;
  if (calibrationDate) updateData.calibrationDate = new Date(calibrationDate);

  const sensor = await prisma.sensor.update({
    where: { id },
    data: updateData,
    include: {
      tank: {
        select: {
          id: true,
          name: true,
          location: true,
        }
      }
    }
  });

  logger.info(`Sensor actualizado: ${sensor.name}`);

  res.json({
    success: true,
    data: { sensor },
    message: 'Sensor actualizado exitosamente'
  });
}));

// GET /api/sensors/:id/data - Obtener datos del sensor
router.get('/:id/data', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { startDate, endDate, limit = 100 } = req.query;

  const where: any = { sensorId: id };
  
  if (startDate || endDate) {
    where.timestamp = {};
    if (startDate) where.timestamp.gte = new Date(startDate as string);
    if (endDate) where.timestamp.lte = new Date(endDate as string);
  }

  const sensorData = await prisma.sensorData.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: Number(limit),
    include: {
      sensor: {
        select: {
          id: true,
          name: true,
          type: true,
        }
      }
    }
  });

  res.json({
    success: true,
    data: { sensorData }
  });
}));

// DELETE /api/sensors/:id - Eliminar sensor
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const sensor = await prisma.sensor.findUnique({
    where: { id },
    select: { name: true }
  });

  if (!sensor) {
    throw new CustomError('Sensor no encontrado', 404);
  }

  await prisma.sensor.delete({
    where: { id }
  });

  logger.info(`Sensor eliminado: ${sensor.name}`);

  res.json({
    success: true,
    message: 'Sensor eliminado exitosamente'
  });
}));

export default router;