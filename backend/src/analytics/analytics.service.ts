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
import { User, Role, Prisma, SensorType } from '@prisma/client';
import { CorrelationFiltersDto } from './dto/correlation-filters.dto';
import { subDays, startOfDay, endOfDay, subMonths, subYears, parseISO, isValid } from 'date-fns';

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
    try {
      // @ts-ignore
      const aggregations = await this.prisma.sensorData.aggregate({
        where: { sensor: { tank: { userId } } },
        _min: { timestamp: true },
        _max: { timestamp: true },
      });

      return {
        firstDataPoint: aggregations._min.timestamp,
        lastDataPoint: aggregations._max.timestamp,
      };
    } catch (error) {
      this.logger.error(`Error obteniendo rango de fechas para usuario ${userId}:`, error);
      return {
        firstDataPoint: null,
        lastDataPoint: null,
      };
    }
  }

  /**
   * @method getKpis
   * @description Obtiene las métricas KPI basadas en los filtros proporcionados.
   * @param {AnalyticsFiltersDto} filters - Filtros de consulta
   * @param {User} user - Usuario que realiza la consulta
   * @returns {Promise<{average: number, max: number, min: number, count: number, stdDev: number}>}
   */
  async getKpis(filters: AnalyticsFiltersDto, user: User) {
    try {
      const where = this.buildWhereClause(filters, user);
      // @ts-ignore
      const aggregations = await this.prisma.sensorData.aggregate({
        where,
        _avg: { value: true },
        _max: { value: true },
        _min: { value: true },
        _count: { value: true },
      });

      if (!aggregations._count.value) {
        return {
          average: null,
          max: null,
          min: null,
          count: 0,
          stdDev: null,
        };
      }

      const variance = await this.calculateVariance(where);

      return {
        average: aggregations._avg.value,
        max: aggregations._max.value,
        min: aggregations._min.value,
        count: aggregations._count.value,
        stdDev: variance > 0 ? Math.sqrt(variance) : 0,
      };
    } catch (error) {
      this.logger.error('Error obteniendo KPIs:', error);
      throw new BadRequestException('Error al obtener las métricas KPI');
    }
  }

  /**
   * @method getTimeSeries
   * @description Obtiene datos de series temporales basados en los filtros.
   * @param {AnalyticsFiltersDto} filters - Filtros de consulta
   * @param {User} user - Usuario que realiza la consulta
   * @returns {Promise<Array>}
   */
  async getTimeSeries(filters: AnalyticsFiltersDto, user: User) {
    try {
      const where = this.buildWhereClause(filters, user);
      // @ts-ignore
      const data = await this.prisma.sensorData.findMany({
        where,
        orderBy: { timestamp: 'asc' },
        select: { 
          timestamp: true, 
          value: true, 
          sensor: { 
            select: { name: true, type: true } 
          } 
        },
        take: 1000, 
      });

      return data;
    } catch (error) {
      this.logger.error('Error obteniendo series temporales:', error);
      throw new BadRequestException('Error al obtener los datos de series temporales');
    }
  }

  /**
   * @method getAlertsSummary
   * @description Obtiene un resumen de alertas agrupadas por tipo y severidad.
   * @param {AnalyticsFiltersDto} filters - Filtros de consulta
   * @param {User} user - Usuario que realiza la consulta
   * @returns {Promise<{alertsByType: Array, alertsBySeverity: Array}>}
   */
  async getAlertsSummary(filters: AnalyticsFiltersDto, user: User) {
    try {
      const targetUserId = this.resolveTargetUserId(filters.userId, user);
      const dateFilter = this.getDateFilter(filters.range, filters.startDate, filters.endDate);

      const [alertsByType, alertsBySeverity] = await Promise.all([
        // @ts-ignore
        this.prisma.alert.groupBy({
          by: ['type'],
          where: { userId: targetUserId, createdAt: dateFilter },
          _count: { type: true },
        }).catch(error => {
          this.logger.warn('Error obteniendo alertas por tipo:', error);
          return [];
        }),
        // @ts-ignore
        this.prisma.alert.groupBy({
          by: ['severity'],
          where: { userId: targetUserId, createdAt: dateFilter },
          _count: { severity: true },
        }).catch(error => {
          this.logger.warn('Error obteniendo alertas por severidad:', error);
          return [];
        })
      ]);

      return { alertsByType, alertsBySeverity };
    } catch (error) {
      this.logger.error('Error obteniendo resumen de alertas:', error);
      return { alertsByType: [], alertsBySeverity: [] };
    }
  }

  /**
   * @method getCorrelations
   * @description Obtiene datos de correlación entre dos tipos de sensores.
   * @param {CorrelationFiltersDto} filters - Filtros de correlación
   * @param {User} user - Usuario que realiza la consulta
   * @returns {Promise<Array<{x: number, y: number}>>}
   */
  async getCorrelations(filters: CorrelationFiltersDto, user: User) {
    try {
      this.logger.log('Procesando correlaciones con filtros:', JSON.stringify(filters));

      const sensorTypeX = filters.sensorTypeX || SensorType.TEMPERATURE;
      const sensorTypeY = filters.sensorTypeY || SensorType.PH;

      if (!Object.values(SensorType).includes(sensorTypeX)) {
        throw new BadRequestException(`Tipo de sensor X inválido: ${sensorTypeX}`);
      }

      if (!Object.values(SensorType).includes(sensorTypeY)) {
        throw new BadRequestException(`Tipo de sensor Y inválido: ${sensorTypeY}`);
      }

      if (sensorTypeX === sensorTypeY) {
        throw new BadRequestException('Los tipos de sensor X e Y deben ser diferentes para la correlación');
      }

      const targetUserId = this.resolveTargetUserId(filters.userId, user);
      const dateFilter = this.getDateFilter(filters.range, filters.startDate, filters.endDate);
      const { tankId, sensorId } = filters;

      const baseWhere = {
        timestamp: dateFilter,
        sensor: {
          tank: {
            userId: targetUserId,
            ...(tankId && tankId !== 'ALL' && { id: tankId }),
          },
          ...(sensorId && sensorId !== 'ALL' && { id: sensorId }),
        },
      };

      const whereX: Prisma.SensorDataWhereInput = {
        ...baseWhere,
        sensor: {
          ...baseWhere.sensor,
          type: sensorTypeX,
        },
      };

      const whereY: Prisma.SensorDataWhereInput = {
        ...baseWhere,
        sensor: {
          ...baseWhere.sensor,
          type: sensorTypeY,
        },
      };

      const [dataX, dataY] = await Promise.all([
        // @ts-ignore
        this.prisma.sensorData.findMany({
          where: whereX,
          orderBy: { timestamp: 'asc' },
          select: { value: true, timestamp: true },
          take: 500,
        }),
        // @ts-ignore
        this.prisma.sensorData.findMany({
          where: whereY,
          orderBy: { timestamp: 'asc' },
          select: { value: true, timestamp: true },
          take: 500,
        })
      ]);

      this.logger.log(`Datos obtenidos - X: ${dataX.length}, Y: ${dataY.length}`);

      if (dataX.length === 0 || dataY.length === 0) {
        this.logger.warn('No se encontraron datos suficientes para la correlación');
        return [];
      }

      const yMap = new Map(dataY.map((d) => [this.normalizeTimestamp(d.timestamp), d.value]));
      const correlationData = dataX
        .map((dx) => {
          const normalizedTime = this.normalizeTimestamp(dx.timestamp);
          const yValue = yMap.get(normalizedTime);
          return yValue !== undefined ? { x: dx.value, y: yValue } : null;
        })
        .filter((item): item is { x: number; y: number } => item !== null);

      this.logger.log(`Puntos de correlación generados: ${correlationData.length}`);

      return correlationData;

    } catch (error) {
      this.logger.error('Error obteniendo correlaciones:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error al obtener los datos de correlación');
    }
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
    const dateFilter = this.getDateFilter(filters.range, filters.startDate, filters.endDate);

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
   * @description Genera el filtro de fechas basado en el rango especificado o fechas custom.
   * @private
   * @param {string} range - Rango de tiempo (day, week, month, year)
   * @param {string} startDate - Fecha de inicio custom (opcional)
   * @param {string} endDate - Fecha de fin custom (opcional)
   * @returns {{ gte: Date; lte: Date }}
   */
  private getDateFilter(range?: string, startDate?: string, endDate?: string): { gte: Date; lte: Date } {
    if (startDate && endDate) {
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      
      if (isValid(start) && isValid(end)) {
        return { gte: start, lte: end };
      }
    }

    const now = new Date();
    switch (range) {
      case 'day': return { gte: startOfDay(now), lte: endOfDay(now) };
      case 'month': return { gte: subMonths(now, 1), lte: now };
      case 'year': return { gte: subYears(now, 1), lte: now };
      case 'week': 
      default: return { gte: subDays(now, 7), lte: now };
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
    try {
      // @ts-ignore
      const data = await this.prisma.sensorData.findMany({ 
        where,
        select: { value: true },
        take: 1000, 
      });

      if (data.length < 2) return 0;
      
      const values = data.map(d => d.value);
      const mean = values.reduce((acc, curr) => acc + curr, 0) / values.length;
      const variance = values.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / (values.length - 1);
      
      return variance;
    } catch (error) {
      this.logger.error('Error calculando varianza:', error);
      return 0;
    }
  }

  /**
   * @method normalizeTimestamp
   * @description Normaliza timestamps para permitir correlación con tolerancia de tiempo.
   * @private
   * @param {Date} timestamp - Timestamp a normalizar
   * @returns {string} Timestamp normalizado a minutos
   */
  private normalizeTimestamp(timestamp: Date): string {
    const normalized = new Date(timestamp);
    normalized.setSeconds(0, 0); 
    return normalized.toISOString();
  }
}