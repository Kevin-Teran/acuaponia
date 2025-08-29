/**
 * @file dashboard.service.ts
 * @description Servicio con la lógica de negocio para obtener y procesar los datos del dashboard.
 * @author Kevin Mariano
 * @version 1.0.0
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
   * @method getDashboardData
   * @description Obtiene datos agregados y de series de tiempo para el dashboard, aplicando filtros.
   * @param {GetDashboardDataDto} filters - Los filtros a aplicar en la consulta.
   * @param {User} currentUser - El usuario autenticado que realiza la solicitud.
   * @returns {Promise<object>} Un objeto con los datos para los velocímetros, tarjetas y gráficos.
   */
  async getDashboardData(
    filters: GetDashboardDataDto,
    currentUser: any, 
  ) {
    const { userId, tankId, startDate, endDate } = filters;

    const whereClause: any = {
      ...(tankId && { tankId }),
    };

    if (currentUser.role !== Role.ADMIN && currentUser.role !== Role.SUPER_ADMIN) {
      whereClause.tank = {
        userId: currentUser.id,
      };
    } else if (userId) { 
      whereClause.tank = {
        userId: Number(userId),
      };
    }

    if (startDate && endDate) {
      whereClause.timestamp = {
        gte: startDate > endDate ? endDate : startDate,
        lte: startDate > endDate ? startDate : endDate,
      };
    }

    const latestData = await this.prisma.dataPoint.findFirst({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      include: { sensor: true },
    });

    const summaryData = await this.prisma.dataPoint.aggregate({
      where: whereClause,
      _avg: { ph: true, temperature: true, tds: true },
      _max: { ph: true, temperature: true, tds: true },
      _min: { ph: true, temperature: true, tds: true },
    });

    const timeSeriesData = await this.prisma.dataPoint.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true, ph: true, temperature: true, tds: true },
    });

    return {
      latestData: latestData || null, 
      summary: {
        avg: summaryData._avg,
        max: summaryData._max,
        min: summaryData._min,
      },
      timeSeries: timeSeriesData,
    };
  }
}