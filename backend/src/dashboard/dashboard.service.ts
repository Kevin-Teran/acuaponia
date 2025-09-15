/**
 * @file dashboard.service.ts
 * @route /backend/src/dashboard
 * @description Servicio para la lógica de negocio del dashboard con datos optimizados.
 * @author Kevin Mariano
 * @version 1.0.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import { Role, SensorType, User } from '@prisma/client';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

@Injectable()
export class DashboardService {
    private readonly logger = new Logger(DashboardService.name);

    constructor(private prisma: PrismaService) {}

    /**
     * @method getSummary
     * @description Obtiene datos de resumen para las tarjetas principales del dashboard.
     * @param {DashboardFiltersDto} filters - Filtros de la solicitud.
     * @param {User} user - El usuario que realiza la solicitud.
     * @returns {Promise<object>} - Datos de resumen.
     */
    async getSummary(filters: DashboardFiltersDto, user: User) {
        const targetUserId = this.resolveTargetUserId(filters.userId, user);
        const [tanksCount, sensorsCount, recentAlerts, totalDataPoints] =
            await Promise.all([
                this.prisma.tank.count({ where: { userId: targetUserId } }),
                this.prisma.sensor.count({
                    where: { tank: { userId: targetUserId } },
                }),
                this.prisma.alert.count({
                    where: {
                        userId: targetUserId,
                        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
                    },
                }),
                this.prisma.sensorData.count({
                    where: { sensor: { tank: { userId: targetUserId } } },
                }),
            ]);

        const summary = {
            tanksCount,
            sensorsCount,
            activeSimulations: 0, // Placeholder
            recentAlerts,
            totalDataPoints,
        };

        if (user.role === Role.ADMIN) {
            const [totalUsers, totalTanks, totalSensors] = await Promise.all([
                this.prisma.user.count(),
                this.prisma.tank.count(),
                this.prisma.sensor.count(),
            ]);
            (summary as any).adminStats = { totalUsers, totalTanks, totalSensors };
        }

        return summary;
    }

    /**
     * @method getRealtimeData
     * @description Obtiene los últimos datos de cada sensor para la visualización en tiempo real.
     * @param {DashboardFiltersDto} filters - Filtros de la solicitud.
     * @param {User} user - El usuario que realiza la solicitud.
     * @returns {Promise<object>} - Datos en tiempo real agrupados por tipo de sensor.
     */
    async getRealtimeData(filters: DashboardFiltersDto, user: User) {
        const targetUserId = this.resolveTargetUserId(filters.userId, user);
        const whereClause: any = {
            sensor: {
                tank: {
                    userId: targetUserId,
                    ...(filters.tankId && { id: filters.tankId }),
                },
                ...(filters.sensorType && { type: filters.sensorType }),
            },
        };
        const latestData = await this.prisma.sensorData.findMany({
            where: whereClause,
            orderBy: { timestamp: 'desc' },
            distinct: ['sensorId'],
            include: {
                sensor: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        hardwareId: true,
                        tank: { select: { id: true, name: true } },
                    },
                },
            },
        });
        return latestData.reduce((acc, data) => {
            const type = data.sensor.type;
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push({
                sensorId: data.sensor.id,
                sensorName: data.sensor.name,
                tankName: data.sensor.tank.name,
                value: data.value,
                timestamp: data.timestamp,
                hardwareId: data.sensor.hardwareId,
            });
            return acc;
        }, {} as Record<SensorType, any[]>);
    }

    /**
     * @method getHistoricalData
     * @description Obtiene datos históricos para un tanque y rango de fechas.
     * SOLUCIÓN: Se reemplaza la consulta SQL cruda por una consulta Prisma simple
     * y se procesan los datos en la aplicación. Esto resuelve el error 500.
     */
    async getHistoricalData(filters: DashboardFiltersDto, user: User) {
        const { tankId, startDate, endDate, sensorType } = filters;

        if (!startDate || !endDate) {
            throw new BadRequestException('Los parámetros startDate y endDate son requeridos.');
        }

        const formattedData = Object.values(SensorType).reduce(
            (acc, type) => {
                acc[type] = [];
                return acc;
            },
            {} as Record<SensorType, { time: string; value: number }[]>,
        );

        if (!tankId) {
            return formattedData;
        }

        const fromDate = startOfDay(parseISO(startDate));
        const toDate = endOfDay(parseISO(endDate));

        this.logger.debug(
            `Fetching historical data for tank ${tankId} from ${fromDate.toISOString()} to ${toDate.toISOString()}`,
        );

        const sensorTypesToFetch = sensorType
            ? [sensorType]
            : [SensorType.TEMPERATURE, SensorType.PH, SensorType.OXYGEN];

        for (const type of sensorTypesToFetch) {
            const rawData = await this.prisma.sensorData.findMany({
                where: {
                    sensor: {
                        tankId: tankId,
                        type: type,
                    },
                    timestamp: {
                        gte: fromDate,
                        lte: toDate,
                    },
                },
                select: {
                    value: true,
                    timestamp: true,
                },
                orderBy: {
                    timestamp: 'asc',
                },
            });

            if (rawData.length > 0) {
                formattedData[type] = rawData.map((d) => ({
                    time: d.timestamp.toISOString(),
                    value: d.value,
                }));
            }
        }
        
        return formattedData;
    }

    /**
     * @method getTanksOverview
     * @description Obtiene una vista general de todos los tanques de un usuario.
     * @param {DashboardFiltersDto} filters - Filtros de la solicitud.
     * @param {User} user - El usuario que realiza la solicitud.
     * @returns {Promise<object[]>} - Lista de tanques con sus datos clave.
     */
    async getTanksOverview(filters: DashboardFiltersDto, user: User) {
        const targetUserId = this.resolveTargetUserId(filters.userId, user);
        const tanks = await this.prisma.tank.findMany({
            where: {
                userId: targetUserId,
                ...(filters.tankId && { id: filters.tankId }),
            },
            include: {
                sensors: {
                    include: { sensorData: { orderBy: { timestamp: 'desc' }, take: 1 } },
                },
                _count: { select: { sensors: true } },
            },
        });
        return tanks.map((tank) => ({
            id: tank.id,
            name: tank.name,
            location: tank.location,
            status: tank.status,
            sensorsCount: tank._count.sensors,
            lastReading:
                tank.sensors.length > 0
                    ? tank.sensors.reduce((latest, sensor) => {
                            const sensorLastReading = sensor.sensorData[0]?.timestamp;
                            return !latest || (sensorLastReading && sensorLastReading > latest)
                                ? sensorLastReading
                                : latest;
                      }, null as Date | null)
                    : null,
            sensors: tank.sensors.map((sensor) => ({
                id: sensor.id,
                name: sensor.name,
                type: sensor.type,
                status: sensor.status,
                lastValue: sensor.sensorData[0]?.value || null,
                lastUpdate: sensor.sensorData[0]?.timestamp || null,
            })),
        }));
    }

    /**
     * @method getUsersList
     * @description Obtiene la lista de usuarios (solo para administradores).
     * @param {User} user - El usuario que realiza la solicitud.
     * @returns {Promise<object[]>} - Lista de usuarios.
     */
    async getUsersList(user: User) {
        if (user.role !== Role.ADMIN) {
            throw new ForbiddenException(
                'Solo los administradores pueden acceder a la lista de usuarios',
            );
        }
        return this.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                _count: { select: { tanks: true } },
            },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * @method resolveTargetUserId
     * @description Resuelve el ID del usuario objetivo basado en el rol del solicitante.
     * @param {string | undefined} requestedUserId - ID del usuario solicitado en el filtro.
     * @param {User} currentUser - El usuario autenticado que realiza la solicitud.
     * @returns {string} - El ID del usuario final para la consulta.
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
}

