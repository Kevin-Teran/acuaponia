import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface CreateSensorDataInput {
  sensorId: string;
  temperature?: number | null;
  ph?: number | null;
  oxygen?: number | null;
  timestamp?: Date;
}

export interface SensorDataQuery {
  sensorId?: string;
  tankId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class SensorDataService {
  async createSensorData(data: CreateSensorDataInput) {
    try {
      // Verificar que el sensor existe
      const sensor = await prisma.sensor.findUnique({
        where: { id: data.sensorId },
        include: { tank: true }
      });

      if (!sensor) {
        throw new Error(`Sensor con ID ${data.sensorId} no encontrado`);
      }

      // Crear el registro de datos
      const sensorData = await prisma.sensorData.create({
        data: {
          sensorId: data.sensorId,
          tankId: sensor.tankId,
          temperature: data.temperature,
          ph: data.ph,
          oxygen: data.oxygen,
          timestamp: data.timestamp || new Date(),
        },
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
        }
      });

      // Actualizar la última lectura del sensor
      await prisma.sensor.update({
        where: { id: data.sensorId },
        data: {
          lastReading: data.temperature || data.ph || data.oxygen || sensor.lastReading,
          lastUpdate: new Date(),
        }
      });

      logger.debug(`Datos de sensor creados: ${data.sensorId}`);
      return sensorData;

    } catch (error) {
      logger.error('Error creando datos de sensor:', error);
      throw error;
    }
  }

  async getSensorData(query: SensorDataQuery) {
    try {
      const where: any = {};

      if (query.sensorId) {
        where.sensorId = query.sensorId;
      }

      if (query.tankId) {
        where.tankId = query.tankId;
      }

      if (query.startDate || query.endDate) {
        where.timestamp = {};
        if (query.startDate) {
          where.timestamp.gte = query.startDate;
        }
        if (query.endDate) {
          where.timestamp.lte = query.endDate;
        }
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
        take: query.limit || 100,
        skip: query.offset || 0,
      });

      return sensorData;

    } catch (error) {
      logger.error('Error obteniendo datos de sensor:', error);
      throw error;
    }
  }

  async getLatestSensorData(sensorId: string) {
    try {
      const latestData = await prisma.sensorData.findFirst({
        where: { sensorId },
        orderBy: { timestamp: 'desc' },
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

      return latestData;

    } catch (error) {
      logger.error('Error obteniendo últimos datos de sensor:', error);
      throw error;
    }
  }

  async getSensorDataStatistics(sensorId: string, startDate?: Date, endDate?: Date) {
    try {
      const where: any = { sensorId };

      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = startDate;
        if (endDate) where.timestamp.lte = endDate;
      }

      const data = await prisma.sensorData.findMany({
        where,
        select: {
          temperature: true,
          ph: true,
          oxygen: true,
        }
      });

      if (data.length === 0) {
        return null;
      }

      // Calcular estadísticas
      const temperatures = data.map(d => d.temperature).filter(t => t !== null) as number[];
      const phs = data.map(d => d.ph).filter(p => p !== null) as number[];
      const oxygens = data.map(d => d.oxygen).filter(o => o !== null) as number[];

      const calculateStats = (values: number[]) => {
        if (values.length === 0) return null;
        
        const sorted = values.sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        
        return { min, max, avg, count: values.length };
      };

      return {
        temperature: calculateStats(temperatures),
        ph: calculateStats(phs),
        oxygen: calculateStats(oxygens),
        totalRecords: data.length,
      };

    } catch (error) {
      logger.error('Error calculando estadísticas de sensor:', error);
      throw error;
    }
  }

  async deleteSensorData(sensorId: string, olderThan?: Date) {
    try {
      const where: any = { sensorId };

      if (olderThan) {
        where.timestamp = { lt: olderThan };
      }

      const result = await prisma.sensorData.deleteMany({ where });

      logger.info(`Eliminados ${result.count} registros de datos del sensor ${sensorId}`);
      return result;

    } catch (error) {
      logger.error('Error eliminando datos de sensor:', error);
      throw error;
    }
  }

  async cleanupOldData(daysToKeep: number = 365) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.sensorData.deleteMany({
        where: {
          timestamp: { lt: cutoffDate }
        }
      });

      logger.info(`Limpieza automática: eliminados ${result.count} registros antiguos`);
      return result;

    } catch (error) {
      logger.error('Error en limpieza automática de datos:', error);
      throw error;
    }
  }
}

export const sensorDataService = new SensorDataService();
export default sensorDataService;