/**
 * @file data.service.ts
 * @description Lógica de negocio para la gestión de datos de sensores, con simulación inteligente.
 * @author Kevin Mariano (Reconstruido y optimizado por Gemini)
 * @version 4.1.0
 * @since 1.0.0
 */
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { ManualEntryDto } from './dto/manual-entry.dto';
import { GetLatestDataDto } from './dto/get-latest-data.dto';
import { SensorData, SensorType, User, Role } from '@prisma/client';

// Tu lógica de simulación inteligente se mantiene intacta
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

  /**
   * @method createFromMqtt
   * @description Recibe datos desde MQTT, busca el sensor por hardwareId y guarda la entrada.
   * @param hardwareId - El ID de hardware del sensor.
   * @param data - El payload con el valor y timestamp.
   * @throws {NotFoundException} Si el sensor con el hardwareId no se encuentra.
   */
  async createFromMqtt(hardwareId: string, data: { value: number; timestamp?: string }) {
    this.logger.log(`[MQTT] Buscando sensor con hardwareId: ${hardwareId}`);
    const sensor = await this.prisma.sensor.findUnique({ where: { hardwareId } });

    if (!sensor) {
      // --- ESTA ES LA CORRECCIÓN CLAVE ---
      // En lugar de fallar en silencio, ahora lanzamos un error que el mqtt.service puede capturar.
      throw new NotFoundException(`Sensor con hardwareId "${hardwareId}" no fue encontrado en la base de datos.`);
    }

    this.logger.log(`[MQTT] Sensor encontrado (ID: ${sensor.id}). Guardando dato...`);
    return this.createAndBroadcastEntry({
      sensorId: sensor.id,
      tankId: sensor.tankId,
      type: sensor.type,
      value: data.value,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    });
  }

  async submitManualEntry(entries: ManualEntryDto[]): Promise<any[]> {
    const createdData = [];
    for (const entry of entries) {
      const sensor = await this.prisma.sensor.findUnique({ where: { id: entry.sensorId } });
      if (!sensor) throw new NotFoundException(`El sensor con ID ${entry.sensorId} no fue encontrado.`);
      
      const data = await this.createAndBroadcastEntry({
        sensorId: entry.sensorId,
        tankId: sensor.tankId,
        type: sensor.type,
        value: entry.value,
        timestamp: entry.timestamp || new Date(),
      });
      createdData.push(data);
    }
    return createdData;
  }
  
  // Todas tus otras funciones se mantienen como estaban
  async getLatest(query: GetLatestDataDto, user: User): Promise<SensorData[]> {
    const { tankId, type } = query;
    if (!tankId) throw new BadRequestException('El parámetro tankId es requerido.');
    if (user.role !== 'ADMIN') {
        const tank = await this.prisma.tank.findFirst({ where: { id: tankId, userId: user.id } });
        if (!tank) throw new ForbiddenException('No tienes permiso para acceder a los datos de este tanque.');
    }
    const sensors = await this.prisma.sensor.findMany({ where: { tankId, type }, select: { id: true } });
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
    if (!tankId || !startDate || !endDate) throw new BadRequestException('Faltan los parámetros tankId, startDate o endDate.');
    if (user.role !== 'ADMIN') {
        const tank = await this.prisma.tank.findFirst({ where: { id: tankId, userId: user.id } });
        if (!tank) throw new ForbiddenException('No tienes permiso para acceder a los datos de este tanque.');
    }
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59`);
    const rawData = await this.prisma.sensorData.findMany({
        where: { sensor: { tankId }, timestamp: { gte: start, lte: end } },
        orderBy: { timestamp: 'asc' },
        include: { sensor: true }
    });
    return { data: rawData };
  }

  async startEmitters(sensorIds: string[]): Promise<void> {
    for (const sensorId of sensorIds) {
      if (this.activeEmitters.has(sensorId)) continue;
      const sensor = await this.prisma.sensor.findUnique({ where: { id: sensorId }, include: { tank: { include: { user: true } } } });
      if (!sensor) { this.logger.warn(`Simulador: No se encontró el sensor con ID ${sensorId}.`); continue; }
      const userSettings = (sensor.tank.user.settings as any)?.thresholds || {};
      const sensorTypeKey = sensor.type;
      const defaultThreshold = DEFAULT_THRESHOLDS[sensorTypeKey];
      const thresholds = { min: userSettings[sensorTypeKey]?.min ?? defaultThreshold.min, max: userSettings[sensorTypeKey]?.max ?? defaultThreshold.max };
      let emitterState: ActiveEmitter = { intervalId: null as any, sensorId: sensor.id, sensorName: sensor.name, type: sensor.type, tankName: sensor.tank.name, userName: sensor.tank.user.name, thresholds, currentValue: (thresholds.min + thresholds.max) / 2, state: 'STABLE', startTime: new Date() };
      const intervalId = setInterval(async () => {
        const { currentValue, state } = this.generateRealisticValue(emitterState);
        emitterState.currentValue = currentValue;
        emitterState.state = state;
        // La simulación ahora también guarda en la base de datos
        await this.createAndBroadcastEntry({ sensorId, tankId: sensor.tankId, type: sensor.type, value: currentValue, timestamp: new Date() });
      }, 5000);
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

  private async createAndBroadcastEntry(data: { sensorId: string; tankId: string; type: SensorType; value: number; timestamp: Date }): Promise<SensorData> {
    const { sensorId, tankId, type, value, timestamp } = data;
    const createdData = await this.prisma.sensorData.create({
      data: { value, timestamp, sensorId, tankId, type },
      include: { sensor: true },
    });
    await this.prisma.sensor.update({ where: { id: sensorId }, data: { lastReading: value, lastUpdate: new Date() } });
    this.eventsGateway.broadcastNewData(createdData);
    this.logger.log(`Dato para ${type} (valor: ${value}) guardado y emitido.`);
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