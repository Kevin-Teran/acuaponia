/**
 * @file analytics.service.ts
 * @route backend/src/analytics/
 * @description Servicio para la lógica de negocio de analíticas avanzadas.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsFiltersDto } from './dto/analytics-filters.dto';
import { User, Role, Prisma, SensorType } from '@prisma/client';
import { CorrelationFiltersDto } from './dto/correlation-filters.dto';
import { subDays, startOfDay, endOfDay, subMonths, subYears } from 'date-fns';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async getDataDateRange(userId: string) {
    const aggregations = await this.prisma.sensorData.aggregate({
      where: { sensor: { tank: { userId } } },
      _min: { timestamp: true },
      _max: { timestamp: true },
    });
    return {
      firstDataPoint: aggregations._min.timestamp,
      lastDataPoint: aggregations._max.timestamp,
    };
  }

  async getKpis(filters: AnalyticsFiltersDto, user: User) {
    const where = this.buildWhereClause(filters, user);

    const aggregations = await this.prisma.sensorData.aggregate({
      where,
      _avg: { value: true },
      _max: { value: true },
      _min: { value: true },
      _count: { value: true },
    });

    const variance = await this.calculateVariance(where);

    return {
      average: aggregations._avg.value,
      max: aggregations._max.value,
      min: aggregations._min.value,
      count: aggregations._count.value,
      stdDev: Math.sqrt(variance),
    };
  }

  async getTimeSeries(filters: AnalyticsFiltersDto, user: User) {
    const where = this.buildWhereClause(filters, user);
    return this.prisma.sensorData.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true, value: true, sensor: { select: { name: true, type: true } } },
    });
  }

  async getAlertsSummary(filters: AnalyticsFiltersDto, user: User) {
    const targetUserId = this.resolveTargetUserId(filters.userId, user);
    const dateFilter = this.getDateFilter(filters.range);

    const alertsByType = await this.prisma.alert.groupBy({
      by: ['type'],
      where: { userId: targetUserId, createdAt: dateFilter },
      _count: { type: true },
    });

    const alertsBySeverity = await this.prisma.alert.groupBy({
      by: ['severity'],
      where: { userId: targetUserId, createdAt: dateFilter },
      _count: { severity: true },
    });

    return { alertsByType, alertsBySeverity };
  }

  private buildWhereClause(
    filters: AnalyticsFiltersDto,
    user: User,
  ): Prisma.SensorDataWhereInput {
    const targetUserId = this.resolveTargetUserId(filters.userId, user);
    const dateFilter = this.getDateFilter(filters.range);

    const whereClause: Prisma.SensorDataWhereInput = {
      timestamp: dateFilter,
      sensor: {
        tank: {
          userId: targetUserId,
          ...(filters.tankId && filters.tankId !== 'ALL' && { id: filters.tankId }),
        },
        ...(filters.sensorId && filters.sensorId !== 'ALL' && { id: filters.sensorId }),
        ...(filters.sensorType && { type: filters.sensorType }),
      },
    };
    return whereClause;
  }

  private getDateFilter(range?: string): { gte: Date; lte: Date } {
    const now = new Date();
    switch (range) {
      case 'day': return { gte: startOfDay(now), lte: endOfDay(now) };
      case 'month': return { gte: subMonths(now, 1), lte: now };
      case 'year': return { gte: subYears(now, 1), lte: now };
      case 'week': default: return { gte: subDays(now, 7), lte: now };
    }
  }

  private resolveTargetUserId(requestedUserId: string | undefined, currentUser: User): string {
    if (currentUser.role === Role.ADMIN && requestedUserId) {
      return requestedUserId;
    }
    return currentUser.id;
  }

  private async calculateVariance(where: Prisma.SensorDataWhereInput): Promise<number> {
    const data = await this.prisma.sensorData.findMany({ where });
    if (data.length < 2) return 0;
    const mean = data.reduce((acc, curr) => acc + curr.value, 0) / data.length;
    const variance = data.reduce((acc, curr) => acc + Math.pow(curr.value - mean, 2), 0) / (data.length - 1);
    return variance;
  }
  
   async getCorrelations(filters: CorrelationFiltersDto, user: User) {
    const targetUserId = this.resolveTargetUserId(filters.userId, user);
    const dateFilter = this.getDateFilter(filters.range);
    const { tankId, sensorId, sensorTypeX, sensorTypeY } = filters;

    const whereBase: Prisma.SensorDataWhereInput = {
      timestamp: dateFilter,
      sensor: {
        tank: {
          userId: targetUserId,
          ...(tankId && tankId !== 'ALL' && { id: tankId }),
        },
        ...(sensorId && sensorId !== 'ALL' && { id: sensorId }),
      },
    };

    const dataX = await this.prisma.sensorData.findMany({
      where: { ...whereBase, sensor: { ...whereBase.sensor, type: sensorTypeX } },
      orderBy: { timestamp: 'asc' },
      select: { value: true, timestamp: true },
    });

    const dataY = await this.prisma.sensorData.findMany({
      where: { ...whereBase, sensor: { ...whereBase.sensor, type: sensorTypeY } },
      orderBy: { timestamp: 'asc' },
      select: { value: true, timestamp: true },
    });

    const yMap = new Map(dataY.map((d) => [d.timestamp.toISOString(), d.value]));
    const correlationData = dataX
      .map((dx) => {
        const yValue = yMap.get(dx.timestamp.toISOString());
        return yValue !== undefined ? { x: dx.value, y: yValue } : null;
      })
      .filter((item): item is { x: number; y: number } => item !== null);

    return correlationData;
  }
}