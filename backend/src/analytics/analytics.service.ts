/**
 * @file analytics.service.ts
 * @route backend/src/analytics/
 * @description Servicio de analíticas OPTIMIZADO con motor estadístico tipo R (Pearson/Spearman Logic)
 * @author Kevin Mariano
 * @version 2.1.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsFiltersDto } from './dto/analytics-filters.dto';
import { User, Role, Prisma, sensors_type as SensorTypePrisma } from '@prisma/client';
import { CorrelationFiltersDto } from './dto/correlation-filters.dto';
import { subDays, startOfDay, endOfDay, subMonths, subYears, parseISO, isValid } from 'date-fns';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly MAX_POINTS = 500; 

  constructor(private prisma: PrismaService) {}

  /**
   * @method getDataDateRange
   * @description Obtiene el rango de fechas de los datos para un usuario específico.
   */
  async getDataDateRange(userId: string) {
    try {
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
   * @method calculateOptimalSampling
   * @description Calcula el factor de muestreo óptimo basado en la cantidad de datos
   */
  private calculateOptimalSampling(totalPoints: number, maxPoints: number = this.MAX_POINTS): number {
    if (totalPoints <= maxPoints) return 1;
    return Math.ceil(totalPoints / maxPoints);
  }

  /**
   * @method applySampling
   * @description Aplica muestreo uniforme a los datos
   */
  private applySampling<T>(data: T[], samplingFactor: number): T[] {
    if (samplingFactor <= 1 || data.length === 0) return data;
    
    const sampled = data.filter((_, index) => index % samplingFactor === 0);
    
    if (data.length > 0 && !sampled.includes(data[data.length - 1])) {
      sampled.push(data[data.length - 1]);
    }
    
    return sampled;
  }

  /**
   * @method getKpis
   * @description Obtiene las métricas KPI con validación mejorada
   */
  async getKpis(filters: AnalyticsFiltersDto, user: User) {
    try {
      const where = this.buildWhereClause(filters, user);
      
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
   * @description Obtiene datos de series temporales CON MUESTREO INTELIGENTE
   */
  async getTimeSeries(filters: AnalyticsFiltersDto, user: User) {
    try {
      const where = this.buildWhereClause(filters, user);
      
      const totalCount = await this.prisma.sensorData.count({ where });
      
      const samplingFactor = this.calculateOptimalSampling(totalCount);
      
      this.logger.log(
        `📊 [TimeSeries] Total: ${totalCount} pts | Muestreo: 1:${samplingFactor} | Retorno: ~${Math.ceil(totalCount / samplingFactor)} pts`
      );
      
      const allData = await this.prisma.sensorData.findMany({
        where,
        orderBy: { timestamp: 'asc' },
        select: { 
          timestamp: true, 
          value: true, 
          type: true,
          sensor: { 
            select: { 
              name: true, 
              type: true,
              hardwareId: true,
            } 
          } 
        },
      });

      const sampledData = this.applySampling(allData, samplingFactor);
      
      this.logger.log(`✅ [TimeSeries] Retornando: ${sampledData.length} puntos`);
      
      return {
        data: sampledData,
        metadata: {
          totalPoints: totalCount,
          returnedPoints: sampledData.length,
          samplingFactor,
          compressionRatio: totalCount > 0 ? (sampledData.length / totalCount * 100).toFixed(1) + '%' : '100%',
        }
      };
    } catch (error) {
      this.logger.error('Error obteniendo series temporales:', error);
      throw new BadRequestException('Error al obtener los datos de series temporales');
    }
  }

  /**
   * @method getAlertsSummary
   * @description Obtiene un resumen de alertas agrupadas por tipo y severidad.
   */
  async getAlertsSummary(filters: AnalyticsFiltersDto, user: User) {
    try {
      const targetUserId = this.resolveTargetUserId(filters.userId, user);
      const dateFilter = this.getDateFilter(filters.range, filters.startDate, filters.endDate);

      const [alertsByType, alertsBySeverity] = await Promise.all([
        this.prisma.alert.groupBy({
          by: ['type'],
          where: { 
            sensor: { tank: { userId: targetUserId } },
            createdAt: dateFilter 
          },
          _count: { type: true },
        }).catch(error => {
          this.logger.warn('Error obteniendo alertas por tipo:', error);
          return [];
        }),
        this.prisma.alert.groupBy({
          by: ['severity'],
          where: { 
            sensor: { tank: { userId: targetUserId } },
            createdAt: dateFilter 
          },
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
   * @description Obtiene datos de correlación simple X vs Y (Legacy)
   */
  async getCorrelations(filters: CorrelationFiltersDto, user: User) {
    try {
      this.logger.log('🔗 [Correlations] Procesando con filtros:', JSON.stringify(filters));

      const sensorTypeX = filters.sensorTypeX || SensorTypePrisma.TEMPERATURE;
      const sensorTypeY = filters.sensorTypeY || SensorTypePrisma.PH;

      if (!Object.values(SensorTypePrisma).includes(sensorTypeX as any)) {
        throw new BadRequestException(`Tipo de sensor X inválido: ${sensorTypeX}`);
      }

      if (!Object.values(SensorTypePrisma).includes(sensorTypeY as any)) {
        throw new BadRequestException(`Tipo de sensor Y inválido: ${sensorTypeY}`);
      }

      if (sensorTypeX === sensorTypeY) {
        throw new BadRequestException('Los tipos de sensor X e Y deben ser diferentes para la correlación');
      }

      const targetUserId = this.resolveTargetUserId(filters.userId, user);
      const dateFilter = this.getDateFilter(filters.range, filters.startDate, filters.endDate);
      const { tankId, sensorId } = filters;

      const baseWhere: Prisma.SensorDataWhereInput = {
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
          ...(baseWhere.sensor as Prisma.SensorWhereInput),
          type: sensorTypeX,
        },
      };

      const whereY: Prisma.SensorDataWhereInput = {
        ...baseWhere,
        sensor: {
          ...(baseWhere.sensor as Prisma.SensorWhereInput),
          type: sensorTypeY,
        },
      };

      const [dataX, dataY] = await Promise.all([
        this.prisma.sensorData.findMany({
          where: whereX,
          orderBy: { timestamp: 'asc' },
          select: { value: true, timestamp: true },
          take: 1000, 
        }),
        this.prisma.sensorData.findMany({
          where: whereY,
          orderBy: { timestamp: 'asc' },
          select: { value: true, timestamp: true },
          take: 1000,
        })
      ]);

      if (dataX.length === 0 || dataY.length === 0) {
        this.logger.warn('⚠️ [Correlations] No se encontraron datos suficientes');
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

      const samplingFactor = this.calculateOptimalSampling(correlationData.length);
      return this.applySampling(correlationData, samplingFactor);

    } catch (error) {
      this.logger.error('❌ [Correlations] Error:', error);
      if (error instanceof BadRequestException) { throw error; }
      throw new BadRequestException('Error al obtener los datos de correlación');
    }
  }

  /**
   * @method getAdvancedCorrelationMatrix
   * @description Implementación ESTADÍSTICA ROBUSTA (Tipo R cor/pearson).
   * Genera una matriz completa de correlación entre todas las variables disponibles.
   */
  async getAdvancedCorrelationMatrix(filters: AnalyticsFiltersDto, user: User) {
    try {
      const where = this.buildWhereClause(filters, user);
      
      const rawData = await this.prisma.sensorData.findMany({
        where,
        select: {
          timestamp: true,
          value: true,
          sensor: { select: { type: true } }
        },
        orderBy: { timestamp: 'asc' }
      });

      if (rawData.length < 10) return { matrix: [], warning: "Insuficientes datos para análisis estadístico (Min 10 pts)" };

      const timeMap = new Map<string, Record<string, number[]>>();

      rawData.forEach(d => {
        const timeKey = new Date(d.timestamp).setMinutes(0, 0, 0).toString();
        
        if (!timeMap.has(timeKey)) {
          timeMap.set(timeKey, {});
        }
        const entry = timeMap.get(timeKey);
        const type = d.sensor.type;

        if (!entry[type]) entry[type] = [];
        entry[type].push(d.value);
      });

      const alignedData: Record<string, number[]> = {};
      const sensorTypes = [...new Set(rawData.map(d => d.sensor.type))];

      sensorTypes.forEach(t => alignedData[t] = []);

      for (const [_, sensors] of timeMap) {
        sensorTypes.forEach(type => {
            if (sensors[type] && sensors[type].length > 0) {
                const avg = sensors[type].reduce((a, b) => a + b, 0) / sensors[type].length;
                alignedData[type].push(avg);
            } else {
                alignedData[type].push(null); 
            }
        });
      }

      const matrix = [];
      
      for (const typeX of sensorTypes) {
        const row = { variable: typeX, correlations: {} };
        
        for (const typeY of sensorTypes) {
          if (typeX === typeY) {
            row.correlations[typeY] = 1.0; 
            continue;
          }

          const validPairs = alignedData[typeX].map((val, i) => ({ x: val, y: alignedData[typeY][i] }))
                                               .filter(p => p.x !== null && p.y !== null);

          row.correlations[typeY] = this.calculatePearsonCorrelation(validPairs);
        }
        matrix.push(row);
      }

      return {
        matrix,
        sampleSize: timeMap.size,
        interpretation: this.generateStatisticalInsight(matrix)
      };

    } catch (error) {
      this.logger.error('Error en matriz de correlación avanzada:', error);
      throw new BadRequestException('Error calculando estadísticas avanzadas');
    }
  }

  private calculatePearsonCorrelation(data: { x: number, y: number }[]): number {
    const n = data.length;
    if (n < 2) return 0;

    const sumX = data.reduce((acc, p) => acc + p.x, 0);
    const sumY = data.reduce((acc, p) => acc + p.y, 0);
    const sumXY = data.reduce((acc, p) => acc + p.x * p.y, 0);
    const sumX2 = data.reduce((acc, p) => acc + p.x * p.x, 0);
    const sumY2 = data.reduce((acc, p) => acc + p.y * p.y, 0);

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));

    if (denominator === 0) return 0;
    return parseFloat((numerator / denominator).toFixed(4));
  }

  private generateStatisticalInsight(matrix: any[]): string[] {
    const insights = [];
    const seenPairs = new Set();

    matrix.forEach(row => {
      Object.entries(row.correlations).forEach(([key, val]: [string, number]) => {
        if (row.variable !== key) {
           const pairId = [row.variable, key].sort().join('-');
           if (seenPairs.has(pairId)) return;
           seenPairs.add(pairId);

           const strength = Math.abs(val);
           if (strength > 0.6) { 
             const direction = val > 0 ? "positiva" : "negativa"; 
             const magnitude = strength > 0.8 ? "muy fuerte" : "moderada";
             
             insights.push(
               `Correlación ${direction} ${magnitude} (r=${val}) entre ${row.variable} y ${key}. ` +
               (val < 0 ? `(Cuando ${row.variable} sube, ${key} tiende a bajar).` : `(Se mueven en la misma dirección).`)
             );
           }
        }
      });
    });
    return insights;
  }

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
        ...(filters.sensorType && { type: filters.sensorType as SensorTypePrisma }),
      },
    };
    
    return whereClause;
  }

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

  private resolveTargetUserId(requestedUserId: string | undefined, currentUser: User): string {
    if (currentUser.role === Role.ADMIN && requestedUserId) {
      return requestedUserId;
    }
    return currentUser.id;
  }

  private async calculateVariance(where: Prisma.SensorDataWhereInput): Promise<number> {
    try {
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

  private normalizeTimestamp(timestamp: Date): string {
    const normalized = new Date(timestamp);
    normalized.setSeconds(0, 0); 
    return normalized.toISOString();
  }
}