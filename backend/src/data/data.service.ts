/**
 * @file data.service.ts
 * @description Servicio para gestionar la lógica de negocio de los datos de sensores.
 * @author kevin mariano
 * @version 2.0.0
 * @since 1.0.0
 */

import { Injectable, NotFoundException, OnModuleDestroy, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SensorData, SensorType, User } from '@prisma/client';
import { GetLatestDataDto } from './dto/get-latest-data.dto'; // Asegúrate de que este DTO exista

type SimulationState = 'STABLE' | 'RISING' | 'FALLING';

interface ActiveEmitter {
  intervalId: NodeJS.Timeout;
  sensorId: string;
  sensorName: string;
  type: SensorType;
  tankName: string;
  userName: string;
  thresholds: { min: number; max: number };
  currentValue: number;
  state: SimulationState;
  startTime: Date;
}

const DEFAULT_THRESHOLDS = {
    TEMPERATURE: { min: 22, max: 28 },
    PH: { min: 6.8, max: 7.6 },
    OXYGEN: { min: 6, max: 10 },
    LEVEL: { min: 40, max: 80 },
    FLOW: { min: 5, max: 15 },
};

@Injectable()
export class DataService implements OnModuleDestroy {
  private readonly activeEmitters = new Map<string, ActiveEmitter>();
  private readonly logger = new Logger(DataService.name);

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  onModuleDestroy() {
    this.activeEmitters.forEach(emitter => clearInterval(emitter.intervalId));
    this.logger.log('Todos los emisores de simulación han sido detenidos.');
  }

  // --- FUNCIÓN AÑADIDA PARA SOLUCIONAR EL ERROR 404 ---
  async getLatest(query: GetLatestDataDto, user: User): Promise<SensorData[]> {
    const { tankId, type } = query;
    if (!tankId) {
      throw new BadRequestException('El parámetro tankId es requerido.');
    }
    if (user.role !== 'ADMIN') {
        const tank = await this.prisma.tank.findFirst({ where: { id: tankId, userId: user.id } });
        if (!tank) throw new ForbiddenException('No tienes permiso para acceder a los datos de este tanque.');
    }

    const sensors = await this.prisma.sensor.findMany({
        where: { tankId, type },
        select: { id: true },
    });

    if (sensors.length === 0) return [];

    const sensorIds = sensors.map(s => s.id);
    const latestDataPromises = sensorIds.map(sensorId =>
        this.prisma.sensorData.findFirst({
            where: { sensorId },
            orderBy: { timestamp: 'desc' },
            include: { sensor: true },
        })
    );
    const results = await Promise.all(latestDataPromises);
    return results.filter(Boolean) as SensorData[];
  }

  async getHistoricalData(user: User, tankId: string, startDate: string, endDate: string): Promise<{ data: SensorData[] }> {
    if (!tankId || !startDate || !endDate) {
      throw new BadRequestException('Faltan los parámetros tankId, startDate o endDate.');
    }
    if (user.role !== 'ADMIN') {
        const tank = await this.prisma.tank.findFirst({ where: { id: tankId, userId: user.id } });
        if (!tank) throw new ForbiddenException('No tienes permiso para acceder a los datos de este tanque.');
    }
    
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);

    const rawData = await this.prisma.sensorData.findMany({
        where: { tankId: tankId, timestamp: { gte: start, lte: end } },
        orderBy: { timestamp: 'asc' },
    });

    return { data: rawData };
  }

  async submitManualEntry(entries: { sensorId: string; value: number }[]): Promise<any[]> {
    const createdData = [];
    for (const entry of entries) {
      const sensor = await this.prisma.sensor.findUnique({ where: { id: entry.sensorId } });
      if (!sensor) throw new NotFoundException(`El sensor con ID ${entry.sensorId} no fue encontrado.`);
      
      const data = await this.createAndBroadcastEntry({
          sensorId: entry.sensorId,
          tankId: sensor.tankId,
          type: sensor.type,
          value: entry.value
      });
      createdData.push(data);
    }
    return createdData;
  }
  
  async createEntryFromMqtt(data: { sensorId: string; tankId: string; type: SensorType; value: number; }): Promise<SensorData> {
    this.logger.log(`Dato de MQTT recibido para sensor ${data.sensorId} con valor ${data.value}`);
    return this.createAndBroadcastEntry(data);
  }

  async startEmitters(sensorIds: string[]): Promise<void> {
    for (const sensorId of sensorIds) {
      if (this.activeEmitters.has(sensorId)) continue;
      const sensor = await this.prisma.sensor.findUnique({ where: { id: sensorId }, include: { tank: { include: { user: true } } }, });
      if (!sensor) { this.logger.warn(`Simulador: No se encontró el sensor con ID ${sensorId}.`); continue; }
      const userSettings = (sensor.tank.user.settings as any)?.thresholds || {};
      const sensorTypeKey = sensor.type.toLowerCase();
      const defaultThreshold = DEFAULT_THRESHOLDS[sensor.type];
      const thresholds = { min: userSettings[sensorTypeKey]?.min ?? defaultThreshold.min, max: userSettings[sensorTypeKey]?.max ?? defaultThreshold.max };
      let emitterState: ActiveEmitter = { intervalId: null as any, sensorId: sensor.id, sensorName: sensor.name, type: sensor.type, tankName: sensor.tank.name, userName: sensor.tank.user.name, thresholds, currentValue: (thresholds.min + thresholds.max) / 2, state: 'STABLE', startTime: new Date() };
      const intervalId = setInterval(() => { const { currentValue, state } = this.generateRealisticValue(emitterState); emitterState.currentValue = currentValue; emitterState.state = state; this.submitManualEntry([{ sensorId, value: currentValue }]); }, 5000);
      emitterState.intervalId = intervalId;
      this.activeEmitters.set(sensorId, emitterState);
      this.logger.log(`✅ Simulador INTELIGENTE iniciado para "${sensor.name}" con rango [${thresholds.min}-${thresholds.max}]`);
    }
  }

  stopEmitter(sensorId: string): void {
    const emitter = this.activeEmitters.get(sensorId);
    if (emitter) { clearInterval(emitter.intervalId); this.activeEmitters.delete(sensorId); this.logger.log(`⏹️ Simulador detenido para el sensor "${emitter.sensorName}"`); }
  }

  getEmitterStatus() {
    return Array.from(this.activeEmitters.values()).map(({ intervalId, ...rest }) => rest);
  }

  private async createAndBroadcastEntry(data: { sensorId: string; tankId: string; type: SensorType; value: number; }): Promise<SensorData> {
    const createdData = await this.prisma.sensorData.create({ data: { ...data, timestamp: new Date() }, include: { sensor: true }, });
    await this.prisma.sensor.update({ where: { id: data.sensorId }, data: { lastReading: data.value, lastUpdate: new Date() } });
    this.eventsGateway.broadcastNewData(createdData);
    return createdData as SensorData;
  }
  
  private generateRealisticValue(emitter: ActiveEmitter): { currentValue: number; state: SimulationState } {
    let { currentValue, state, thresholds, type } = emitter;
    const { min, max } = thresholds;
    const center = (min + max) / 2;
    const range = max - min;
    const eventChance = Math.random();
    if (state === 'STABLE' && eventChance < 0.02) { state = Math.random() < 0.5 ? 'RISING' : 'FALLING'; this.logger.log(`Evento simulado: El sensor "${emitter.sensorName}" ha entrado en estado ${state}`); } else if (state !== 'STABLE' && eventChance < 0.15) { state = 'STABLE'; this.logger.log(`Evento simulado: El sensor "${emitter.sensorName}" vuelve a estado STABLE`); }
    let target = center;
    let volatility = range * 0.05;
    if (state === 'RISING') { target = max + range * 0.2; volatility = range * 0.1; } else if (state === 'FALLING') { target = min - range * 0.2; volatility = range * 0.1; }
    const pull = (target - currentValue) * 0.25;
    const randomStep = (Math.random() - 0.5) * volatility;
    let nextValue = currentValue + pull + randomStep;
    const absoluteLimit = range * 2;
    nextValue = Math.max(min - absoluteLimit, Math.min(nextValue, max + absoluteLimit));
    const precision = (type === 'PH') ? 2 : 1;
    currentValue = parseFloat(nextValue.toFixed(precision));
    return { currentValue, state };
  }
}