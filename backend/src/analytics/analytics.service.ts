/**
 * @file analytics.service.ts
 * @route backend/src/analytics/
 * @description Servicio para la lógica de negocio de analíticas avanzadas.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsFiltersDto } from './dto/analytics-filters.dto';
import { User, Role, SensorType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { CorrelationFiltersDto } from './dto/correlation-filters.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * @method getKpis
   * @description Calcula los Indicadores Clave de Rendimiento (KPIs) para los datos de los sensores.
   * @param {AnalyticsFiltersDto} filters - Filtros para la consulta.
   * @param {User} user - El usuario que realiza la solicitud.
   * @returns {Promise<any>} Un objeto con los KPIs calculados.
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
   * @description Obtiene los datos históricos para un gráfico de series de tiempo.
   * @param {AnalyticsFiltersDto} filters - Filtros para la consulta.
   * @param {User} user - El usuario que realiza la solicitud.
   * @returns {Promise<any>} Datos para el gráfico de series de tiempo.
   */
  async getTimeSeries(filters: AnalyticsFiltersDto, user: User) {
    const where = this.buildWhereClause(filters, user);

    return this.prisma.sensorData.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      select: {
        timestamp: true,
        value: true,
        sensor: {
          select: { name: true, type: true },
        },
      },
    });
  }

  /**
   * @method getAlertsSummary
   * @description Obtiene un resumen de las alertas generadas en el período.
   * @param {AnalyticsFiltersDto} filters - Filtros para la consulta.
   * @param {User} user - El usuario que realiza la solicitud.
   * @returns {Promise<any>} Resumen de alertas por tipo y severidad.
   */
  async getAlertsSummary(filters: AnalyticsFiltersDto, user: User) {
    const targetUserId = this.resolveTargetUserId(filters.userId, user);

    const alertsByType = await this.prisma.alert.groupBy({
      by: ['type'],
      where: {
        userId: targetUserId,
        createdAt: {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        },
      },
      _count: { type: true },
    });

    const alertsBySeverity = await this.prisma.alert.groupBy({
      by: ['severity'],
      where: {
        userId: targetUserId,
        createdAt: {
          gte: new Date(filters.startDate),
          lte: new Date(filters.endDate),
        },
      },
      _count: { severity: true },
    });

    return { alertsByType, alertsBySeverity };
  }

  /**
   * @private
   * @method buildWhereClause
   * @description Construye la cláusula 'where' de Prisma para las consultas.
   * @param {AnalyticsFiltersDto} filters - Filtros de la solicitud.
   * @param {User} user - Usuario actual.
   * @returns {Prisma.SensorDataWhereInput} Cláusula 'where' para Prisma.
   */
  private buildWhereClause(
    filters: AnalyticsFiltersDto,
    user: User,
  ): Prisma.SensorDataWhereInput {
    const targetUserId = this.resolveTargetUserId(filters.userId, user);

    if (!filters.startDate || !filters.endDate) {
      throw new BadRequestException(
        'startDate y endDate son requeridos para las analíticas.',
      );
    }

    return {
      sensor: {
        tank: {
          userId: targetUserId,
          ...(filters.tankId && { id: filters.tankId }),
        },
        ...(filters.sensorType && { type: filters.sensorType }),
      },
      timestamp: {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      },
    };
  }

  /**
   * @private
   * @method resolveTargetUserId
   * @description Resuelve el ID del usuario objetivo basado en el rol del usuario actual.
   * @param {string | undefined} requestedUserId - ID del usuario solicitado.
   * @param {User} currentUser - El usuario que realiza la la solicitud.
   * @returns {string} El ID del usuario objetivo.
   */
  private resolveTargetUserId(
    requestedUserId: string | undefined,
    currentUser: User,
  ): string {
    if (currentUser.role === Role.ADMIN && requestedUserId) {
      return requestedUserId;
    }
    return currentUser.id;
  }

  /**
   * @private
   * @method calculateVariance
   * @description Calcula la varianza de un conjunto de datos.
   * @param {Prisma.SensorDataWhereInput} where - Cláusula 'where' de Prisma.
   * @returns {Promise<number>} La varianza calculada.
   */
  private async calculateVariance(
    where: Prisma.SensorDataWhereInput,
  ): Promise<number> {
    const data = await this.prisma.sensorData.findMany({ where });
    if (data.length < 2) return 0;

    const mean = data.reduce((acc, curr) => acc + curr.value, 0) / data.length;
    const variance =
      data.reduce((acc, curr) => acc + Math.pow(curr.value - mean, 2), 0) /
      (data.length - 1);

    return variance;
  }

  /**
   * @method getCorrelations
   * @description Obtiene datos para analizar la correlación entre dos tipos de sensores.
   * @param {CorrelationFiltersDto} filters - Filtros para la consulta.
   * @param {User} user - El usuario que realiza la solicitud.
   * @returns {Promise<any[]>} Un array de puntos de datos para el gráfico de dispersión.
   */
   async getCorrelations(filters: CorrelationFiltersDto, user: User) {
    const targetUserId = this.resolveTargetUserId(filters.userId, user);
    const { startDate, endDate, tankId, sensorTypeX, sensorTypeY } = filters;

    const whereBase = {
      tank: {
        userId: targetUserId,
        ...(tankId && { id: tankId }),
      },
      timestamp: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    const dataX = await this.prisma.sensorData.findMany({
      where: { ...whereBase, type: sensorTypeX },
      orderBy: { timestamp: 'asc' },
      select: { value: true, timestamp: true },
    });

    const dataY = await this.prisma.sensorData.findMany({
      where: { ...whereBase, type: sensorTypeY },
      orderBy: { timestamp: 'asc' },
      select: { value: true, timestamp: true },
    });

    const yMap = new Map(dataY.map((d) => [d.timestamp.toISOString(), d.value]));

    const correlationData = dataX
      .map((dx) => {
        const yValue = yMap.get(dx.timestamp.toISOString());
        return yValue !== undefined
          ? { x: dx.value, y: yValue }
          : null;
      })
      .filter(Boolean);

    return correlationData;
  }
}