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

  /**
   * @method getDataDateRange
   * @description Obtiene el rango de fechas de los datos para un usuario específico.
   * @param {string} userId - ID del usuario
   * @returns {Promise<{firstDataPoint: Date | null, lastDataPoint: Date | null}>}
   */
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

  /**
   * @method getKpis
   * @description Obtiene las métricas KPI basadas en los filtros proporcionados.
   * @param {AnalyticsFiltersDto} filters - Filtros de consulta
   * @param {User} user - Usuario que realiza la consulta
   * @returns {Promise<{average: number, max: number, min: number, count: number, stdDev: number}>}
   */
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

  /**
   * @method getTimeSeries
   * @description Obtiene datos de series temporales basados en los filtros.
   * @param {AnalyticsFiltersDto} filters - Filtros de consulta
   * @param {User} user - Usuario que realiza la consulta
   * @returns {Promise<Array>}
   */
  async getTimeSeries(filters: AnalyticsFiltersDto, user: User) {
    const where = this.buildWhereClause(filters, user);
    return this.prisma.sensorData.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true, value: true, sensor: { select: { name: true, type: true } } },
    });
  }

  /**
   * @method getAlertsSummary
   * @description Obtiene un resumen de alertas agrupadas por tipo y severidad.
   * @param {AnalyticsFiltersDto} filters - Filtros de consulta
   * @param {User} user - Usuario que realiza la consulta
   * @returns {Promise<{alertsByType: Array, alertsBySeverity: Array}>}
   */
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

  /**
   * @method buildWhereClause
   * @description Construye la cláusula WHERE para las consultas de Prisma.
   * @private
   * @param {AnalyticsFiltersDto} filters - Filtros de consulta
   * @param {User} user - Usuario que realiza la consulta
   * @returns {Prisma.SensorDataWhereInput}
   */
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

  /**
   * @method getDateFilter
   * @description Genera el filtro de fechas basado en el rango especificado.
   * @private
   * @param {string} range - Rango de tiempo (day, week, month, year)
   * @returns {{ gte: Date; lte: Date }}
   */
  private getDateFilter(range?: string): { gte: Date; lte: Date } {
    const now = new Date();
    switch (range) {
      case 'day': return { gte: startOfDay(now), lte: endOfDay(now) };
      case 'month': return { gte: subMonths(now, 1), lte: now };
      case 'year': return { gte: subYears(now, 1), lte: now };
      case 'week': default: return { gte: subDays(now, 7), lte: now };
    }
  }

  /**
   * @method resolveTargetUserId
   * @description Resuelve el ID del usuario objetivo basado en permisos.
   * @private
   * @param {string | undefined} requestedUserId - ID del usuario solicitado
   * @param {User} currentUser - Usuario actual
   * @returns {string}
   */
  private resolveTargetUserId(requestedUserId: string | undefined, currentUser: User): string {
    if (currentUser.role === Role.ADMIN && requestedUserId) {
      return requestedUserId;
    }
    return currentUser.id;
  }

  /**
   * @method calculateVariance
   * @description Calcula la varianza de los datos que coinciden con la consulta WHERE.
   * @private
   * @param {Prisma.SensorDataWhereInput} where - Cláusula WHERE
   * @returns {Promise<number>}
   */
  private async calculateVariance(where: Prisma.SensorDataWhereInput): Promise<number> {
    const data = await this.prisma.sensorData.findMany({ where });
    if (data.length < 2) return 0;
    const mean = data.reduce((acc, curr) => acc + curr.value, 0) / data.length;
    const variance = data.reduce((acc, curr) => acc + Math.pow(curr.value - mean, 2), 0) / (data.length - 1);
    return variance;
  }
  
  /**
   * @method getCorrelations
   * @description Obtiene datos de correlación entre dos tipos de sensores.
   * @param {CorrelationFiltersDto} filters - Filtros de correlación
   * @param {User} user - Usuario que realiza la consulta
   * @returns {Promise<Array<{x: number, y: number}>>}
   */
  async getCorrelations(filters: CorrelationFiltersDto, user: User) {
    const targetUserId = this.resolveTargetUserId(filters.userId, user);
    const dateFilter = this.getDateFilter(filters.range);
    const { tankId, sensorId, sensorTypeX, sensorTypeY } = filters;

    // Consulta para datos del sensor X
    const whereX: Prisma.SensorDataWhereInput = {
      timestamp: dateFilter,
      sensor: {
        type: sensorTypeX,
        tank: {
          userId: targetUserId,
          ...(tankId && tankId !== 'ALL' && { id: tankId }),
        },
        ...(sensorId && sensorId !== 'ALL' && { id: sensorId }),
      },
    };

    // Consulta para datos del sensor Y
    const whereY: Prisma.SensorDataWhereInput = {
      timestamp: dateFilter,
      sensor: {
        type: sensorTypeY,
        tank: {
          userId: targetUserId,
          ...(tankId && tankId !== 'ALL' && { id: tankId }),
        },
        ...(sensorId && sensorId !== 'ALL' && { id: sensorId }),
      },
    };

    // Ejecutar consultas por separado
    const dataX = await this.prisma.sensorData.findMany({
      where: whereX,
      orderBy: { timestamp: 'asc' },
      select: { value: true, timestamp: true },
    });

    const dataY = await this.prisma.sensorData.findMany({
      where: whereY,
      orderBy: { timestamp: 'asc' },
      select: { value: true, timestamp: true },
    });

    // Mapeo y correlación de datos por timestamp
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