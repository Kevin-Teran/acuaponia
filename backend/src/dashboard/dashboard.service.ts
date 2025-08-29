/**
 * @file dashboard.service.ts
 * @description Servicio con la lógica de negocio para obtener y procesar los datos del dashboard.
 * @author Kevin Mariano
 * @version 1.3.0 - FIX compatibilidad de tipos de sensores y null safety
 * @since 1.0.0
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetDashboardDataDto } from './dto/get-dashboard-data.dto';
import { Role, User } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Normaliza los tipos de sensor para que coincidan con el código interno
   */
  private normalizeType(type: string): 'TEMPERATURE' | 'PH' | 'OXYGEN' | null {
    switch (type?.toUpperCase()) {
      case 'TEMPERATURE':
      case 'TEMPERATURA':
        return 'TEMPERATURE';
      case 'PH':
        return 'PH';
      case 'OXYGEN':
      case 'OXIGENO_DISUELTO':
      case 'OXIGENO':
        return 'OXYGEN';
      default:
        return null;
    }
  }

  /**
   * @method getDashboardData
   * @description Obtiene datos agregados y de series de tiempo para el dashboard, aplicando filtros.
   */
  async getDashboardData(filters: GetDashboardDataDto, currentUser: any) {
    const { userId, tankId, startDate, endDate } = filters;

    const sensorWhereClause: any = {
      ...(tankId && { tankId }),
    };

    if (currentUser.role !== Role.ADMIN) {
      sensorWhereClause.tank = { userId: currentUser.id };
    } else if (userId) {
      sensorWhereClause.tank = { userId: Number(userId) };
    }

    const dataWhereClause: any = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      dataWhereClause.timestamp = {
        gte: start > end ? end : start,
        lte: start > end ? start : end,
      };
    }

    try {
      const sensors = await this.prisma.sensor.findMany({
        where: sensorWhereClause,
        select: {
          id: true,
          type: true,
          name: true,
          lastReading: true,
          lastUpdate: true,
        },
      });

      if (sensors.length === 0) {
        return {
          latestData: null,
          summary: {
            avg: { temperature: null, ph: null, oxygen: null },
            max: { temperature: null, ph: null, oxygen: null },
            min: { temperature: null, ph: null, oxygen: null },
          },
          timeSeries: [],
        };
      }

      const sensorIds = sensors.map((s) => s.id);

      const latestByType = await this.getLatestDataByType(
        sensorIds,
        dataWhereClause,
      );

      const allSensorData = await this.prisma.sensorData.findMany({
        where: {
          sensorId: { in: sensorIds },
          ...dataWhereClause,
        },
        include: { sensor: { select: { type: true } } },
      });

      const timeSeriesData = await this.getTimeSeriesDataByType(
        sensorIds,
        dataWhereClause,
      );

      return {
        latestData: latestByType,
        summary: this.formatSummaryData(allSensorData, sensors),
        timeSeries: timeSeriesData,
      };
    } catch (error) {
      console.error('Error en getDashboardData:', error);
      throw error;
    }
  }

  /**
   * @method getLatestDataByType
   * @description Obtiene los datos más recientes agrupados por tipo de sensor
   */
  private async getLatestDataByType(sensorIds: string[], dataWhereClause: any) {
    const sensors = await this.prisma.sensor.findMany({
      where: { id: { in: sensorIds } },
      include: {
        sensorData: {
          where: dataWhereClause,
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    const result: any = {};

    for (const sensor of sensors) {
      const latestReading = sensor.sensorData[0];
      const value = latestReading?.value ?? sensor.lastReading;
      const normalizedType = this.normalizeType(sensor.type);

      if (!normalizedType) continue;

      switch (normalizedType) {
        case 'TEMPERATURE':
          result.temperature = value ?? null;
          break;
        case 'PH':
          result.ph = value ?? null;
          break;
        case 'OXYGEN':
          result.oxygen = value ?? null;
          break;
      }
    }

    return result;
  }

  /**
   * @method getTimeSeriesDataByType
   * @description Obtiene datos de series de tiempo organizados por tipo
   */
  private async getTimeSeriesDataByType(
    sensorIds: string[],
    dataWhereClause: any,
  ) {
    const timeSeriesRaw = await this.prisma.sensorData.findMany({
      where: {
        sensorId: { in: sensorIds },
        ...dataWhereClause,
      },
      orderBy: { timestamp: 'asc' },
      include: { sensor: { select: { type: true } } },
    });

    const timeSeriesMap = new Map();

    for (const data of timeSeriesRaw) {
      const timestamp = data.timestamp.toISOString();
      const normalizedType = this.normalizeType(data.sensor.type);

      if (!timeSeriesMap.has(timestamp)) {
        timeSeriesMap.set(timestamp, {
          timestamp: data.timestamp,
          temperature: null,
          ph: null,
          oxygen: null,
        });
      }

      const entry = timeSeriesMap.get(timestamp);

      switch (normalizedType) {
        case 'TEMPERATURE':
          entry.temperature = data.value;
          break;
        case 'PH':
          entry.ph = data.value;
          break;
        case 'OXYGEN':
          entry.oxygen = data.value;
          break;
      }
    }

    return Array.from(timeSeriesMap.values());
  }

  /**
   * @method formatSummaryData
   * @description Formatea los datos de resumen para el frontend
   */
  private formatSummaryData(allSensorData: any[], sensors: any[]) {
    const summary = {
      avg: { temperature: null, ph: null, oxygen: null },
      max: { temperature: null, ph: null, oxygen: null },
      min: { temperature: null, ph: null, oxygen: null },
    };

    const dataByType = {
      TEMPERATURE: [] as number[],
      PH: [] as number[],
      OXYGEN: [] as number[],
    };

    for (const data of allSensorData) {
      const normalizedType = this.normalizeType(data.sensor.type);
      if (data.value !== null && normalizedType) {
        dataByType[normalizedType].push(data.value);
      }
    }

    const calculateStats = (values: number[]) => {
      if (values.length === 0) return { min: null, max: null, avg: null };
      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      return { min, max, avg };
    };

    // Temperatura
    const tempStats = calculateStats(dataByType.TEMPERATURE);
    if (tempStats.min === null) {
      const tempSensor = sensors.find(
        (s) => this.normalizeType(s.type) === 'TEMPERATURE',
      );
      if (tempSensor?.lastReading !== undefined && tempSensor.lastReading !== null) {
        summary.avg.temperature = tempSensor.lastReading;
        summary.max.temperature = tempSensor.lastReading;
        summary.min.temperature = tempSensor.lastReading;
      }
    } else {
      summary.avg.temperature = tempStats.avg;
      summary.max.temperature = tempStats.max;
      summary.min.temperature = tempStats.min;
    }

    // pH
    const phStats = calculateStats(dataByType.PH);
    if (phStats.min === null) {
      const phSensor = sensors.find(
        (s) => this.normalizeType(s.type) === 'PH',
      );
      if (phSensor?.lastReading !== undefined && phSensor.lastReading !== null) {
        summary.avg.ph = phSensor.lastReading;
        summary.max.ph = phSensor.lastReading;
        summary.min.ph = phSensor.lastReading;
      }
    } else {
      summary.avg.ph = phStats.avg;
      summary.max.ph = phStats.max;
      summary.min.ph = phStats.min;
    }

    // Oxígeno
    const oxygenStats = calculateStats(dataByType.OXYGEN);
    if (oxygenStats.min === null) {
      const oxygenSensor = sensors.find(
        (s) => this.normalizeType(s.type) === 'OXYGEN',
      );
      if (oxygenSensor?.lastReading !== undefined && oxygenSensor.lastReading !== null) {
        summary.avg.oxygen = oxygenSensor.lastReading;
        summary.max.oxygen = oxygenSensor.lastReading;
        summary.min.oxygen = oxygenSensor.lastReading;
      }
    } else {
      summary.avg.oxygen = oxygenStats.avg;
      summary.max.oxygen = oxygenStats.max;
      summary.min.oxygen = oxygenStats.min;
    }

    return summary;
  }
}
