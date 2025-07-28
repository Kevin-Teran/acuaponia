import express, { Request, Response } from 'express';
import { prisma } from '../config/database';
import { asyncHandler, CustomError } from '../middleware/errorHandler';
import { tankValidation } from '../middleware/validation';
import { logger } from '../utils/logger';
import { TankStatus } from '@prisma/client';

const router = express.Router();

// GET /api/tanks - Listar tanques
router.get('/', tankValidation.query, asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, status, userId } = req.query;
  
  const where: any = {};
  
  if (status) where.status = status as TankStatus;
  if (userId) where.userId = userId as string;

  const [tanks, total] = await Promise.all([
    prisma.tank.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        sensors: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
          }
        },
        _count: {
          select: {
            sensors: true,
            sensorData: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
    }),
    prisma.tank.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      tanks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// POST /api/tanks - Crear tanque
router.post('/', tankValidation.create, asyncHandler(async (req: Request, res: Response) => {
  const { name, location, capacity, currentLevel, userId } = req.body;

  // Verificar que el usuario existe
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new CustomError('Usuario no encontrado', 404);
  }

  const tank = await prisma.tank.create({
    data: {
      name,
      location,
      capacity,
      currentLevel,
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  });

  logger.info(`Tanque creado: ${tank.name} para usuario ${user.name}`);

  res.status(201).json({
    success: true,
    data: { tank },
    message: 'Tanque creado exitosamente'
  });
}));

// PUT /api/tanks/:id - Actualizar tanque
router.put('/:id', tankValidation.update, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, location, capacity, currentLevel, status } = req.body;

  const updateData: any = {};
  
  if (name) updateData.name = name;
  if (location) updateData.location = location;
  if (capacity !== undefined) updateData.capacity = capacity;
  if (currentLevel !== undefined) updateData.currentLevel = currentLevel;
  if (status) updateData.status = status as TankStatus;

  const tank = await prisma.tank.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      },
      sensors: {
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
        }
      }
    }
  });

  logger.info(`Tanque actualizado: ${tank.name}`);

  res.json({
    success: true,
    data: { tank },
    message: 'Tanque actualizado exitosamente'
  });
}));

// GET /api/tanks/:id/sensors - Obtener sensores del tanque
router.get('/:id/sensors', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const tank = await prisma.tank.findUnique({
    where: { id },
    include: {
      sensors: {
        include: {
          sensorData: {
            take: 1,
            orderBy: { timestamp: 'desc' }
          }
        }
      }
    }
  });

  if (!tank) {
    throw new CustomError('Tanque no encontrado', 404);
  }

  res.json({
    success: true,
    data: { 
      tank: {
        id: tank.id,
        name: tank.name,
        location: tank.location,
      },
      sensors: tank.sensors 
    }
  });
}));

// DELETE /api/tanks/:id - Eliminar tanque
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const tank = await prisma.tank.findUnique({
    where: { id },
    select: { name: true }
  });

  if (!tank) {
    throw new CustomError('Tanque no encontrado', 404);
  }

  await prisma.tank.delete({
    where: { id }
  });

  logger.info(`Tanque eliminado: ${tank.name}`);

  res.json({
    success: true,
    message: 'Tanque eliminado exitosamente'
  });
}));

export default router;