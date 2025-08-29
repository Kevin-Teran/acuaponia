/**
 * @file dashboard.service.ts
 * @description Servicio con la lógica de negocio para el dashboard
 * @version 1.2.0
 * @since 1.0.0
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetDashboardDataDto } from './dto/get-dashboard-data.dto';
import { Role } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @method getDashboardData
   * @description Obtiene los datos agregados y series de tiempo del dashboard
   * @param {GetDashboardDataDto} filters - Filtros de consulta
   * @param {Pick<User, 'id' | 'role'>} currentUser - Usuario autenticado
   * @returns {Promise<object>} Datos para velocímetros, tarjetas y gráficos
   */
  async getDashboardData(
    filters: GetDashboardDataDto,
    currentUser: Pick<{ id: string; role: Role }, 'id' | 'role'>,
  ) {
    const { userId, tankId, startDate, endDate } = filters;

    const sensorWhereClause: any = { ...(tankId && { tankId }) };

    if (currentUser.role !== Role.ADMIN) {
      sensorWhereClause.tank = { userId: currentUser.id };
    } else if (userId) {
      sensorWhereClause.tank = { userId: Number(userId) };
    }

    const dataWhereClause: any = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      dataWhereClause.timestamp = { gte: start > end ? end : start, lte: start > end ? start : end };
    }

    try {
      const sensors = await this.prisma.sensor.findMany({
        where: sensorWhereClause,
        select: { id: true, type: true, name: true, lastReading: true, lastUpdate: true },
      });

      if (!sensors.length) {
        return { latestData: null, summary: { avg: { temperature: null, ph: null, oxygen: null }, max: { temperature: null, ph: null, oxygen: null }, min: { temperature: null, ph: null, oxygen: null } }, timeSeries: [] };
      }

      const sensorIds = sensors.map(s => s.id);

      const latestByType = await this.getLatestDataByType(sensorIds, dataWhereClause);
      const allSensorData = await this.prisma.sensorData.findMany({
        where: { sensorId: { in: sensorIds }, ...dataWhereClause },
        include: { sensor: { select: { type: true } } },
      });
      const timeSeriesData = await this.getTimeSeriesDataByType(sensorIds, dataWhereClause);

      return { latestData: latestByType, summary: this.formatSummaryData(allSensorData, sensors), timeSeries: timeSeriesData };
    } catch (error) {
      console.error('Error en getDashboardData:', error);
      throw error;
    }
  }

  private async getLatestDataByType(sensorIds: string[], dataWhereClause: any) {
    const sensors = await this.prisma.sensor.findMany({
      where: { id: { in: sensorIds } },
      include: { sensorData: { where: dataWhereClause, orderBy: { timestamp: 'desc' }, take: 1 } },
    });

    const result: any = {};
    for (const sensor of sensors) {
      const latestReading = sensor.sensorData[0];
      const value = latestReading?.value ?? sensor.lastReading;
      switch (sensor.type) {
        case 'TEMPERATURE': result.temperature = value; break;
        case 'PH': result.ph = value; break;
        case 'OXYGEN': result.oxygen = value; break;
      }
    }
    return result;
  }

  private async getTimeSeriesDataByType(sensorIds: string[], dataWhereClause: any) {
    const timeSeriesRaw = await this.prisma.sensorData.findMany({
      where: { sensorId: { in: sensorIds }, ...dataWhereClause },
      orderBy: { timestamp: 'asc' },
      include: { sensor: { select: { type: true } } },
    });

    const timeSeriesMap = new Map();
    for (const data of timeSeriesRaw) {
      const timestamp = data.timestamp.toISOString();
      if (!timeSeriesMap.has(timestamp)) {
        timeSeriesMap.set(timestamp, { timestamp: data.timestamp, temperature: null, ph: null, oxygen: null });
      }
      const entry = timeSeriesMap.get(timestamp);
      switch (data.sensor.type) {
        case 'TEMPERATURE': entry.temperature = data.value; break;
        case 'PH': entry.ph = data.value; break;
        case 'OXYGEN': entry.oxygen = data.value; break;
      }
    }
    return Array.from(timeSeriesMap.values());
  }

  private formatSummaryData(allSensorData: any[], sensors: any[]) {
    const summary = { avg: { temperature: null, ph: null, oxygen: null }, max: { temperature: null, ph: null, oxygen: null }, min: { temperature: null, ph: null, oxygen: null } };
    const dataByType = { TEMPERATURE: [], PH: [], OXYGEN: [] } as Record<string, number[]>;

    for (const data of allSensorData) {
      if (data.value != null && dataByType[data.sensor.type]) dataByType[data.sensor.type].push(data.value);
    }

    const calculateStats = (values: number[]) => values.length ? { min: Math.min(...values), max: Math.max(...values), avg: values.reduce((a, b) => a + b, 0) / values.length } : { min: null, max: null, avg: null };

    ['TEMPERATURE', 'PH', 'OXYGEN'].forEach(type => {
      const stats = calculateStats(dataByType[type]);
      if (stats.min === null) {
        const sensor = sensors.find(s => s.type === type);
        if (sensor?.lastReading != null) stats.avg = stats.max = stats.min = sensor.lastReading;
      }
      switch (type) {
        case 'TEMPERATURE': summary.avg.temperature = stats.avg; summary.max.temperature = stats.max; summary.min.temperature = stats.min; break;
        case 'PH': summary.avg.ph = stats.avg; summary.max.ph = stats.max; summary.min.ph = stats.min; break;
        case 'OXYGEN': summary.avg.oxygen = stats.avg; summary.max.oxygen = stats.max; summary.min.oxygen = stats.min; break;
      }
    });

    return summary;
  }
}
