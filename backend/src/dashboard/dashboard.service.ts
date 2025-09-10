/**
 * @file dashboard.service.ts
 * @route /backend/src/dashboard
 * @description Servicio para la lógica de negocio del dashboard con datos optimizados.
 * @author Kevin Mariano & Gemini
 * @version 2.3.0 (Reescritura con Prisma ORM, Muestreo Inteligente y Corrección de Zona Horaria Definitiva)
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
					createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
				},
			}),
		]);
		return {
			tanksCount, sensorsCount, activeSimulations: 0, recentAlerts,
			totalDataPoints: await this.prisma.sensorData.count({
				where: { sensor: { tank: { userId: targetUserId } } },
			}),
		};
	}

	async getRealtimeData(filters: DashboardFiltersDto, user: User) {
		const targetUserId = this.resolveTargetUserId(filters.userId, user);
		const whereClause: any = {
			sensor: {
				tank: { userId: targetUserId, ...(filters.tankId && { id: filters.tankId }) },
				...(filters.sensorType && { type: filters.sensorType }),
			},
		};
		const latestData = await this.prisma.sensorData.findMany({
			where: whereClause, orderBy: { timestamp: 'desc' }, distinct: ['sensorId'],
			include: { sensor: { select: { id: true, name: true, type: true, hardwareId: true, tank: { select: { id: true, name: true } } } } },
		});
		return latestData.reduce((acc, data) => {
			const type = data.sensor.type;
			if (!acc[type]) { acc[type] = []; }
			acc[type].push({
				sensorId: data.sensor.id, sensorName: data.sensor.name, tankName: data.sensor.tank.name,
				value: data.value, timestamp: data.timestamp, hardwareId: data.sensor.hardwareId,
			});
			return acc;
		}, {} as Record<SensorType, any[]>);
	}

	/**
	 * @method getHistoricalData
	 * @description Obtiene datos históricos aplicando un muestreo inteligente.
	 * SOLUCIÓN DEFINITIVA:
	 * - Se eliminan las consultas SQL manuales para usar Prisma ORM, garantizando compatibilidad.
	 * - Manejo explícito de zona horaria para construir rangos de búsqueda precisos.
	 * - Muestreo dinámico en el código para una visualización coherente.
	 */
	async getHistoricalData(filters: DashboardFiltersDto, user: User) {
		const tankId = filters.tankId;

		if (!filters.startDate || !filters.endDate) { throw new BadRequestException('startDate y endDate son requeridos.'); }
		if (!tankId) { return { [SensorType.TEMPERATURE]: [], [SensorType.PH]: [], [SensorType.OXYGEN]: [] }; }

		const fromDate = new Date(`${filters.startDate}T00:00:00.000-05:00`);
		const toDate = new Date(`${filters.endDate}T23:59:59.999-05:00`);

		const sensorTypes = [SensorType.TEMPERATURE, SensorType.PH, SensorType.OXYGEN];
		const formattedData = { [SensorType.TEMPERATURE]: [], [SensorType.PH]: [], [SensorType.OXYGEN]: [] };
		const maxRawPoints = 5000; // Límite de puntos a traer de la BD para no sobrecargar
		const maxChartPoints = 150; // Puntos a mostrar en la gráfica

		for (const type of sensorTypes) {
			const rawData = await this.prisma.sensorData.findMany({
				where: {
					sensor: { tankId: tankId, type: type },
					timestamp: { gte: fromDate, lte: toDate },
				},
				orderBy: { timestamp: 'asc' },
				take: maxRawPoints,
			});

			if (rawData.length > 0) {
				if (rawData.length <= maxChartPoints) {
					formattedData[type] = rawData.map(d => ({ time: d.timestamp.toISOString(), value: d.value }));
				} else {
					const sampled = [];
					const interval = Math.floor(rawData.length / maxChartPoints);
					for (let i = 0; i < rawData.length; i += interval) {
						sampled.push(rawData[i]);
					}
					// Asegurar que el último punto siempre esté
					if (sampled[sampled.length - 1].id !== rawData[rawData.length - 1].id) {
						sampled.push(rawData[rawData.length - 1]);
					}
					formattedData[type] = sampled.map(d => ({ time: d.timestamp.toISOString(), value: d.value }));
				}
			}
		}

		return formattedData;
	}

	async getTanksOverview(filters: DashboardFiltersDto, user: User) {
		const targetUserId = this.resolveTargetUserId(filters.userId, user);
		const tanks = await this.prisma.tank.findMany({
			where: { userId: targetUserId, ...(filters.tankId && { id: filters.tankId }) },
			include: { sensors: { include: { sensorData: { orderBy: { timestamp: 'desc' }, take: 1 } } }, _count: { select: { sensors: true } } },
		});
		return tanks.map((tank) => ({
			id: tank.id, name: tank.name, location: tank.location, status: tank.status, sensorsCount: tank._count.sensors,
			lastReading: tank.sensors.length > 0 ? tank.sensors.reduce((latest, sensor) => {
				const sensorLastReading = sensor.sensorData[0]?.timestamp;
				return !latest || (sensorLastReading && sensorLastReading > latest) ? sensorLastReading : latest;
			}, null as Date | null) : null,
			sensors: tank.sensors.map((sensor) => ({
				id: sensor.id, name: sensor.name, type: sensor.type, status: sensor.status,
				lastValue: sensor.sensorData[0]?.value || null,
				lastUpdate: sensor.sensorData[0]?.timestamp || null,
			})),
		}));
	}

	async getUsersList(user: User) {
		if (user.role !== Role.ADMIN) { throw new ForbiddenException('Solo los administradores pueden acceder a la lista de usuarios'); }
		return this.prisma.user.findMany({
			select: { id: true, name: true, email: true, _count: { select: { tanks: true } } },
			orderBy: { name: 'asc' },
		});
	}

	private resolveTargetUserId(requestedUserId: string | undefined, currentUser: User): string {
		if (currentUser.role === Role.ADMIN && requestedUserId) { return requestedUserId; }
		return currentUser.id;
	}
}