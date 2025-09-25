/**
 * @file dashboard.service.ts
 * @route backend/src/dashboard/
 * @description Servicio para la lógica de negocio del dashboard, incluyendo analíticas en tiempo real.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TankStatus, SensorStatus, Prisma, sensors_type as SensorTypePrisma } from '@prisma/client';
import { subDays, endOfDay, startOfDay, parseISO, isValid } from 'date-fns';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
  ) {}

  /**
   * @method getRealtimeData
   * @description Obtiene los últimos datos de los sensores de un tanque específico.
   * @param {string} tankId - ID del tanque.
   * @returns {Promise<{
   * temperature: number | null;
   * ph: number | null;
   * oxygen: number | null;
   * }>}
   */
  async getRealtimeData(tankId: string) {
    // Obtener los últimos datos de cada tipo de sensor para el tanque
    const latestData = await this.prisma.sensorData.findMany({
      where: {
        tankId,
        sensor: {
          status: 'ACTIVE',
        },
      },
      orderBy: { timestamp: 'desc' },
      distinct: ['type'],
      select: {
        type: true,
        value: true,
      },
    });

    const data: { [key: string]: number | null } = {
      temperature: null,
      ph: null,
      oxygen: null,
    };

    latestData.forEach((d) => {
      if (d.type === 'TEMPERATURE') data.temperature = d.value;
      if (d.type === 'PH') data.ph = d.value;
      if (d.type === 'OXYGEN') data.oxygen = d.value;
    });

    return data;
  }

  /**
   * @method getChartData
   * @description Obtiene datos históricos para un tipo de sensor y un rango de fechas.
   * @param {string} tankId - ID del tanque.
   * @param {string} sensorType - Tipo de sensor.
   * @param {string} range - Rango de tiempo.
   * @param {string} startDate - Fecha de inicio (opcional).
   * @param {string} endDate - Fecha de fin (opcional).
   * @returns {Promise<Array<{timestamp: Date, value: number}>>}
   */
  async getChartData(
    tankId: string,
    sensorType: SensorTypePrisma,
    range: string,
    startDate?: string,
    endDate?: string,
  ) {
    const dateFilter = this.getDateFilter(range, startDate, endDate);
    const data = await this.prisma.sensorData.findMany({
      where: {
        tankId,
        timestamp: dateFilter,
        sensor: {
          status: 'ACTIVE',
          // Correcting the type to use `sensors_type`
          type: sensorType as SensorTypePrisma,
        },
      },
      orderBy: { timestamp: 'asc' },
      select: {
        timestamp: true,
        value: true,
      },
    });

    return data;
  }

  /**
   * @method getSummaryStats
   * @description Obtiene estadísticas de resumen del sistema para usuarios no administradores.
   * @param {string} userId - ID del usuario.
   * @returns {Promise<any>}
   */
  async getSummaryStats(userId: string) {
    const activeTanks = await this.prisma.tank.count({
      where: { userId, status: TankStatus.ACTIVE },
    });

    const activeSensors = await this.prisma.sensor.count({
      where: { tank: { userId }, status: SensorStatus.ACTIVE },
    });

    const totalAlerts = await this.prisma.alert.count({
      where: { userId },
    });

    const pendingAlerts = await this.prisma.alert.count({
      where: { userId, resolved: false },
    });

    return {
      tanks: activeTanks,
      sensors: activeSensors,
      totalAlerts,
      pendingAlerts,
    };
  }

  /**
   * @method getAdminStats
   * @description Obtiene estadísticas de resumen para el dashboard de administradores.
   * @returns {Promise<any>}
   */
  async getAdminStats() {
    const totalUsers = await this.prisma.user.count();
    const totalTanks = await this.prisma.tank.count();
    const totalSensors = await this.prisma.sensor.count();
    const totalAlerts = await this.prisma.alert.count();

    const activeUsers = await this.prisma.user.count({
      where: { status: 'ACTIVE' },
    });

    const activeTanks = await this.prisma.tank.count({
      where: { status: TankStatus.ACTIVE },
    });

    const activeSensors = await this.prisma.sensor.count({
      where: { status: SensorStatus.ACTIVE },
    });

    const userStats = await this.usersService.getUserStats();

    return {
      totalUsers,
      totalTanks,
      totalSensors,
      totalAlerts,
      activeUsers,
      activeTanks,
      activeSensors,
      userStats,
    };
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
      case 'month': return { gte: subDays(now, 30), lte: now }; // Corregido: antes usaba subMonths(now, 1)
      case 'year': return { gte: subDays(now, 365), lte: now }; // Corregido: antes usaba subYears(now, 1)
      case 'week': 
      default: return { gte: subDays(now, 7), lte: now };
    }
  }
}