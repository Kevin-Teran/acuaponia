import express, { Request, Response } from 'express';
import { prisma } from '../config/database';
import { Prisma, AlertSeverity } from '@prisma/client';
import { asyncHandler, CustomError } from '../middleware/errorHandler';
import { alertValidation } from '../middleware/validation';
import { alertService } from '../services/alertService';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/alerts - Listar alertas
router.get('/', alertValidation.query, asyncHandler(async (req: Request, res: Response) => {
  const { 
    page = 1, 
    limit = 20, 
    sensorId, 
    severity, 
    resolved, 
    startDate, 
    endDate 
  } = req.query;

  const query = {
    sensorId: sensorId as string,
    severity: severity as string,
    resolved: resolved === 'true' ? true : resolved === 'false' ? false : undefined,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  };

  const alerts = await alertService.getAlerts(query);

  const where: Prisma.AlertWhereInput = {};
  if (query.sensorId) {
    where.sensorId = query.sensorId;
  }
  if (query.severity) {
    where.severity = query.severity as AlertSeverity;
  }
  if (query.resolved !== undefined) {
    where.resolved = query.resolved;
  }
  if (query.startDate || query.endDate) {
    where.createdAt = {
      ...(query.startDate && { gte: query.startDate }),
      ...(query.endDate && { lte: query.endDate }),
    };
  }

  const total = await prisma.alert.count({ where });

  res.json({
    success: true,
    data: {
      alerts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// POST /api/alerts - Crear alerta manual
router.post('/', alertValidation.create, asyncHandler(async (req: Request, res: Response) => {
  const { type, severity, message, sensorId, value, threshold } = req.body;

  const alert = await alertService.createAlert({
    type,
    severity,
    message,
    sensorId,
    value,
    threshold,
  });

  logger.info(`Alerta manual creada: ${type} - ${severity}`);

  res.status(201).json({
    success: true,
    data: { alert },
    message: 'Alerta creada exitosamente'
  });
}));

// POST /api/alerts/:id/resolve - Resolver alerta
router.post('/:id/resolve', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.body; // En una implementación real, esto vendría del token JWT

  const alert = await alertService.resolveAlert(id, userId);

  res.json({
    success: true,
    data: { alert },
    message: 'Alerta resuelta exitosamente'
  });
}));

// GET /api/alerts/statistics - Estadísticas de alertas
router.get('/statistics', asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  const statistics = await alertService.getAlertStatistics(
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  res.json({
    success: true,
    data: { statistics }
  });
}));

// GET /api/alerts/recent - Alertas recientes
router.get('/recent', asyncHandler(async (req: Request, res: Response) => {
  const { limit = 10 } = req.query;

  const recentAlerts = await prisma.alert.findMany({
    include: {
      sensor: {
        include: {
          tank: {
            select: {
              id: true,
              name: true,
              location: true,
            }
          }
        }
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: Number(limit),
  });

  res.json({
    success: true,
    data: { alerts: recentAlerts }
  });
}));

// GET /api/alerts/critical - Alertas críticas no resueltas
router.get('/critical', asyncHandler(async (req: Request, res: Response) => {
  const criticalAlerts = await prisma.alert.findMany({
    where: {
      severity: 'CRITICAL',
      resolved: false,
    },
    include: {
      sensor: {
        include: {
          tank: {
            select: {
              id: true,
              name: true,
              location: true,
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: { alerts: criticalAlerts }
  });
}));

// DELETE /api/alerts/:id - Eliminar alerta
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const alert = await prisma.alert.findUnique({
    where: { id },
    select: { type: true }
  });

  if (!alert) {
    throw new CustomError('Alerta no encontrada', 404);
  }

  await prisma.alert.delete({
    where: { id }
  });

  logger.info(`Alerta eliminada: ${id}`);

  res.json({
    success: true,
    message: 'Alerta eliminada exitosamente'
  });
}));

export default router;
