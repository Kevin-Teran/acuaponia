import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { SensorType } from '@prisma/client';

/**
 * @interface CreateSensorDataInput
 * @desc Define la estructura para crear un nuevo registro de datos de sensor.
 */
export interface CreateSensorDataInput {
  sensorId: string;
  value: number;
  type: SensorType;
  timestamp?: Date;
}

/**
 * @class SensorDataService
 * @desc Gestiona la lógica de negocio para crear y consultar datos de sensores.
 */
class SensorDataService {
  /**
   * @desc Crea un nuevo registro de datos para un sensor y actualiza la última lectura del sensor.
   * @param {CreateSensorDataInput} data - Los datos de la nueva lectura.
   * @returns {Promise<any>} El registro de datos creado.
   */
  async createSensorData(data: CreateSensorDataInput) {
    try {
      const sensor = await prisma.sensor.findUnique({
        where: { id: data.sensorId },
      });

      if (!sensor) {
        throw new Error(`Sensor con ID ${data.sensorId} no encontrado.`);
      }

      // Crear el registro de datos y actualizar el sensor en una transacción
      const [sensorData] = await prisma.$transaction([
        prisma.sensorData.create({
          data: {
            sensorId: data.sensorId,
            tankId: sensor.tankId,
            type: data.type,
            value: data.value,
            timestamp: data.timestamp || new Date(),
          },
        }),
        prisma.sensor.update({
          where: { id: data.sensorId },
          data: {
            lastReading: data.value,
            lastUpdate: new Date(),
          },
        }),
      ]);

      return sensorData;
    } catch (error) {
      logger.error('Error creando datos de sensor:', error);
      throw error;
    }
  }
}

export const sensorDataService = new SensorDataService();
