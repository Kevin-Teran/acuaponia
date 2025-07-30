import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { SensorType } from '@prisma/client';

/**
 * @interface CreateSensorDataInput
 * @desc Define la estructura para crear un nuevo registro de datos de sensor,
 * alineada con el esquema de base de datos normalizado.
 */
export interface CreateSensorDataInput {
  sensorId: string;
  value: number;
  type: SensorType;
  timestamp?: Date;
}

/**
 * @interface SensorDataQuery
 * @desc Define los parámetros de consulta para obtener datos históricos de sensores.
 */
export interface SensorDataQuery {
  sensorId?: string;
  tankId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * @class SensorDataService
 * @desc Gestiona toda la lógica de negocio relacionada con los datos de los sensores.
 */
class SensorDataService {
  /**
   * @desc Crea un nuevo registro de datos para un sensor.
   * Valida que el sensor exista y que el tipo de dato corresponda al tipo de sensor.
   * Actualiza la última lectura (`lastReading`) del sensor correspondiente.
   * @param {CreateSensorDataInput} data - Los datos de la nueva lectura.
   * @returns {Promise<any>} El registro de datos creado, incluyendo la información del tanque.
   */
  async createSensorData(data: CreateSensorDataInput) {
    try {
      const sensor = await prisma.sensor.findUnique({
        where: { id: data.sensorId },
      });

      if (!sensor) {
        throw new Error(`Sensor con ID ${data.sensorId} no encontrado`);
      }

      if (sensor.type !== data.type) {
        logger.warn(`Intento de registrar un dato de tipo ${data.type} en un sensor de tipo ${sensor.type}`);
        return null;
      }

      const sensorData = await prisma.sensorData.create({
        data: {
          sensorId: data.sensorId,
          tankId: sensor.tankId,
          type: data.type,
          value: data.value,
          timestamp: data.timestamp || new Date(),
        },
        include: {
          tank: true, // Incluir datos del tanque para el socketService
        },
      });
      
      await prisma.sensor.update({
        where: { id: data.sensorId },
        data: {
          lastReading: data.value,
          lastUpdate: new Date(),
        }
      });

      return sensorData;
    } catch (error) {
      logger.error('Error creando datos de sensor:', error);
      throw error;
    }
  }

  /**
   * @desc Obtiene una lista de datos históricos de sensores basada en filtros.
   * @param {SensorDataQuery} query - Los filtros para la consulta.
   * @returns {Promise<any[]>} Un array de registros de datos de sensores.
   */
  async getSensorData(query: SensorDataQuery) {
    try {
      const where: any = {};

      if (query.sensorId) where.sensorId = query.sensorId;
      if (query.tankId) where.tankId = query.tankId;
      if (query.startDate || query.endDate) {
        where.timestamp = {};
        if (query.startDate) where.timestamp.gte = query.startDate;
        if (query.endDate) where.timestamp.lte = query.endDate;
      }

      const sensorData = await prisma.sensorData.findMany({
        where,
        include: {
          sensor: { select: { id: true, name: true, type: true } },
          tank: { select: { id: true, name: true, location: true } }
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

  /**
   * @desc Obtiene estadísticas (promedio, min, max) para un sensor en un rango de fechas.
   * @param {string} sensorId - El ID del sensor.
   * @param {Date} [startDate] - La fecha de inicio del rango.
   * @param {Date} [endDate] - La fecha de fin del rango.
   * @returns {Promise<any>} Un objeto con las estadísticas calculadas.
   */
  async getSensorDataStatistics(sensorId: string, startDate?: Date, endDate?: Date) {
    try {
        const where: any = { sensorId };
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = startDate;
            if (endDate) where.timestamp.lte = endDate;
        }

        const aggregations = await prisma.sensorData.aggregate({
            _avg: { value: true },
            _max: { value: true },
            _min: { value: true },
            _count: { value: true },
            where,
        });

        return {
            avg: aggregations._avg.value,
            min: aggregations._min.value,
            max: aggregations._max.value,
            count: aggregations._count.value,
        };
    } catch (error) {
        logger.error('Error calculando estadísticas de sensor:', error);
        throw error;
    }
  }
}

export const sensorDataService = new SensorDataService();
export default sensorDataService;