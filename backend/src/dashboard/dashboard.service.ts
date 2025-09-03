/**
 * @file dashboard.service.ts
 * @route 
 * @description Servicio para la lógica de negocio del dashboard con datos optimizados.
 * @author Kevin Mariano
 * @version 1.2.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */
import { Injectable, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import { User, Role, SensorType } from '@prisma/client';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getSummary(filters: DashboardFiltersDto, user: User) {
    const targetUserId = this.resolveTargetUserId(filters.userId, user);
    
    const [tanksCount, sensorsCount, recentAlerts] = await Promise.all([
      this.prisma.tank.count({ where: { userId: targetUserId } }),
      this.prisma.sensor.count({ where: { tank: { userId: targetUserId } } }),
      this.prisma.alert.count({ 
        where: { 
          userId: targetUserId,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      })
    ]);

    const activeSimulations = 0; 

    return {
      tanksCount,
      sensorsCount,
      activeSimulations,
      recentAlerts,
      totalDataPoints: await this.prisma.sensorData.count({
        where: { sensor: { tank: { userId: targetUserId } } }
      })
    };
  }

  async getRealtimeData(filters: DashboardFiltersDto, user: User) {
    const targetUserId = this.resolveTargetUserId(filters.userId, user);
    
    // FIX: La cláusula 'where' ahora anida el 'id' del tanque correctamente para un filtrado preciso.
    const whereClause: any = {
      sensor: {
        tank: {
          userId: targetUserId,
          ...(filters.tankId && { id: filters.tankId }) // Se aplica el filtro de tanque si se proporciona.
        },
        ...(filters.sensorType && { type: filters.sensorType }),
      }
    };

    const latestData = await this.prisma.sensorData.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      distinct: ['sensorId'],
      include: {
        sensor: {
          select: { id: true, name: true, type: true, hardwareId: true, tank: { select: { id: true, name: true } } }
        }
      }
    });

    const groupedData = latestData.reduce((acc, data) => {
      const type = data.sensor.type;
      if (!acc[type]) { acc[type] = []; }
      acc[type].push({
        sensorId: data.sensor.id,
        sensorName: data.sensor.name,
        tankName: data.sensor.tank.name,
        value: data.value,
        timestamp: data.timestamp,
        hardwareId: data.sensor.hardwareId
      });
      return acc;
    }, {} as Record<SensorType, any[]>);

    return groupedData;
  }

  async getHistoricalData(filters: DashboardFiltersDto, user: User) {
    const targetUserId = this.resolveTargetUserId(filters.userId, user);
    
    if (!filters.startDate || !filters.endDate) {
      throw new BadRequestException('startDate y endDate son requeridos para datos históricos');
    }

    const whereClause: any = {
      sensor: {
        tank: { 
            userId: targetUserId,
            ...(filters.tankId && { id: filters.tankId })
        },
        ...(filters.sensorType && { type: filters.sensorType })
      },
      timestamp: { gte: new Date(filters.startDate), lte: new Date(filters.endDate) }
    };

    const historicalData = await this.prisma.sensorData.findMany({
      where: whereClause,
      orderBy: { timestamp: 'asc' },
      include: { sensor: { select: { name: true, type: true, tank: { select: { name: true } } } } }
    });

    return historicalData.map(data => ({
      timestamp: data.timestamp, value: data.value, sensorName: data.sensor.name,
      sensorType: data.sensor.type, tankName: data.sensor.tank.name
    }));
  }

  async getTanksOverview(filters: DashboardFiltersDto, user: User) {
    const targetUserId = this.resolveTargetUserId(filters.userId, user);
    
    const tanks = await this.prisma.tank.findMany({
      where: { userId: targetUserId, ...(filters.tankId && { id: filters.tankId }) },
      include: {
        sensors: { include: { sensorData: { orderBy: { timestamp: 'desc' }, take: 1 } } },
        _count: { select: { sensors: true } }
      }
    });

    return tanks.map(tank => ({
      id: tank.id, name: tank.name, location: tank.location, status: tank.status,
      sensorsCount: tank._count.sensors,
      lastReading: tank.sensors.length > 0 ? 
        tank.sensors.reduce((latest, sensor) => {
          const sensorLastReading = sensor.sensorData[0]?.timestamp;
          return !latest || (sensorLastReading && sensorLastReading > latest) ? sensorLastReading : latest;
        }, null as Date | null) : null,
      sensors: tank.sensors.map(sensor => ({
        id: sensor.id, name: sensor.name, type: sensor.type, status: sensor.status,
        lastValue: sensor.sensorData[0]?.value || null,
        lastUpdate: sensor.sensorData[0]?.timestamp || null
      }))
    }));
  }

  async getUsersList(user: User) {
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Solo los administradores pueden acceder a la lista de usuarios');
    }
    return this.prisma.user.findMany({
      select: { id: true, name: true, email: true, _count: { select: { tanks: true } } },
      orderBy: { name: 'asc' }
    });
  }

  private resolveTargetUserId(requestedUserId: string | undefined, currentUser: User): string {
    if (currentUser.role === Role.ADMIN && requestedUserId) {
      return requestedUserId;
    }
    return currentUser.id;
  }
}