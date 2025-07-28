import express from 'express';
import { prisma } from '../config/database';
import { asyncHandler, CustomError } from '../middleware/errorHandler';
import { reportValidation } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/reports - Listar reportes
router.get('/', reportValidation.query, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, type, status, userId } = req.query;
  
  const where: any = {};
  
  if (type) where.type = type;
  if (status) where.status = status;
  if (userId) where.userId = userId;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
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
      skip: (Number(page) - 1) * Number(limit),
    }),
    prisma.report.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// POST /api/reports - Crear reporte
router.post('/', reportValidation.create, asyncHandler(async (req, res) => {
  const { title, type, parameters, userId } = req.body;

  // Verificar que el usuario existe
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new CustomError('Usuario no encontrado', 404);
  }

  const report = await prisma.report.create({
    data: {
      title,
      type: type as any,
      parameters,
      userId,
      status: 'PENDING',
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

  // Aquí se podría agregar lógica para procesar el reporte en background
  // Por ahora, simulamos que se procesa inmediatamente
  setTimeout(async () => {
    try {
      await prisma.report.update({
        where: { id: report.id },
        data: { 
          status: 'COMPLETED',
          filePath: `/reports/${report.id}_${Date.now()}.pdf`
        }
      });
      logger.info(`Reporte procesado: ${report.title}`);
    } catch (error) {
      logger.error(`Error procesando reporte ${report.id}:`, error);
      await prisma.report.update({
        where: { id: report.id },
        data: { status: 'FAILED' }
      });
    }
  }, 2000);

  logger.info(`Reporte creado: ${report.title} por ${user.name}`);

  res.status(201).json({
    success: true,
    data: { report },
    message: 'Reporte creado exitosamente'
  });
}));

// GET /api/reports/:id - Obtener reporte específico
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const report = await prisma.report.findUnique({
    where: { id },
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

  if (!report) {
    throw new CustomError('Reporte no encontrado', 404);
  }

  res.json({
    success: true,
    data: { report }
  });
}));

// GET /api/reports/:id/download - Descargar reporte
router.get('/:id/download', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      filePath: true,
    }
  });

  if (!report) {
    throw new CustomError('Reporte no encontrado', 404);
  }

  if (report.status !== 'COMPLETED') {
    throw new CustomError('El reporte aún no está listo para descarga', 400);
  }

  if (!report.filePath) {
    throw new CustomError('Archivo de reporte no disponible', 404);
  }

  // En una implementación real, aquí se serviría el archivo
  // Por ahora, devolvemos información del archivo
  res.json({
    success: true,
    data: {
      reportId: report.id,
      title: report.title,
      filePath: report.filePath,
      downloadUrl: `/api/reports/${report.id}/file`,
    },
    message: 'Reporte listo para descarga'
  });
}));

// PUT /api/reports/:id - Actualizar reporte
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, parameters } = req.body;

  const updateData: any = {};
  
  if (title) updateData.title = title;
  if (parameters) updateData.parameters = parameters;

  const report = await prisma.report.update({
    where: { id },
    data: updateData,
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

  logger.info(`Reporte actualizado: ${report.title}`);

  res.json({
    success: true,
    data: { report },
    message: 'Reporte actualizado exitosamente'
  });
}));

// DELETE /api/reports/:id - Eliminar reporte
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const report = await prisma.report.findUnique({
    where: { id },
    select: { title: true, filePath: true }
  });

  if (!report) {
    throw new CustomError('Reporte no encontrado', 404);
  }

  await prisma.report.delete({
    where: { id }
  });

  // En una implementación real, aquí se eliminaría también el archivo físico
  // if (report.filePath) {
  //   await fs.unlink(report.filePath);
  // }

  logger.info(`Reporte eliminado: ${report.title}`);

  res.json({
    success: true,
    message: 'Reporte eliminado exitosamente'
  });
}));

// GET /api/reports/generate/data-export - Generar reporte de exportación de datos
router.post('/generate/data-export', asyncHandler(async (req, res) => {
  const { 
    startDate, 
    endDate, 
    sensorIds, 
    format = 'PDF',
    userId 
  } = req.body;

  // Validar parámetros
  if (!startDate || !endDate) {
    throw new CustomError('Fechas de inicio y fin son requeridas', 400);
  }

  if (!userId) {
    throw new CustomError('ID de usuario es requerido', 400);
  }

  // Obtener datos para el reporte
  const where: any = {
    timestamp: {
      gte: new Date(startDate),
      lte: new Date(endDate),
    }
  };

  if (sensorIds && sensorIds.length > 0) {
    where.sensorId = { in: sensorIds };
  }

  const sensorData = await prisma.sensorData.findMany({
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
  });

  // Crear registro del reporte
  const report = await prisma.report.create({
    data: {
      title: `Exportación de Datos ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
      type: 'CUSTOM',
      parameters: {
        startDate,
        endDate,
        sensorIds,
        format,
        recordCount: sensorData.length,
      },
      userId,
      status: 'COMPLETED',
      filePath: `/reports/data-export-${Date.now()}.${format.toLowerCase()}`,
    }
  });

  logger.info(`Reporte de exportación generado: ${sensorData.length} registros`);

  res.json({
    success: true,
    data: { 
      report,
      preview: {
        recordCount: sensorData.length,
        dateRange: { startDate, endDate },
        sensors: sensorData.reduce((acc, data) => {
          if (!acc.find(s => s.id === data.sensor.id)) {
            acc.push(data.sensor);
          }
          return acc;
        }, [] as any[])
      }
    },
    message: 'Reporte de exportación generado exitosamente'
  });
}));

export default router;