import { Injectable, NotFoundException, OnModuleDestroy, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SensorData, SensorType, User } from '@prisma/client';
import { Prisma } from '@prisma/client';

/**
 * @interface ActiveEmitter
 * @description Define la estructura de un emisor de datos simulados activo.
 */
interface ActiveEmitter {
  intervalId: NodeJS.Timeout;
  sensorId: string;
  sensorName: string;
  type: SensorType;
  tankName: string;
  userName: string;
}

/**
 * @function aggregateData
 * @description Agrupa un gran conjunto de datos en intervalos de tiempo promediados para optimizar la visualización.
 * @param data Los datos de sensor sin procesar.
 * @param intervalSeconds El intervalo en segundos para agrupar los datos (ej. 300 para 5 minutos).
 * @returns Un nuevo array de datos agregados y optimizados.
 */
function aggregateData(data: SensorData[], intervalSeconds: number): SensorData[] {
    if (intervalSeconds === 0 || data.length < 200) {
        return data;
    }

    const aggregated = new Map<string, { sum: number; count: number; type: SensorType; sensorId: string; tankId: string }>();
    if (data.length === 0) {
        return [];
    }
    const firstTimestamp = data[0].timestamp.getTime();

    data.forEach(point => {
        const interval = Math.floor((point.timestamp.getTime() - firstTimestamp) / (intervalSeconds * 1000));
        const key = `${interval}-${point.sensorId}-${point.type}`;

        if (!aggregated.has(key)) {
            aggregated.set(key, { sum: 0, count: 0, type: point.type, sensorId: point.sensorId, tankId: point.tankId });
        }
        const entry = aggregated.get(key)!;
        entry.sum += point.value;
        entry.count++;
    });

    return Array.from(aggregated.entries()).map(([key, value]) => {
        const interval = parseInt(key.split('-')[0], 10);
        const timestamp = new Date(firstTimestamp + (interval * intervalSeconds * 1000));
        return {
            id: `agg-${key}`,
            value: value.sum / value.count, 
            type: value.type,
            timestamp,
            createdAt: timestamp,
            sensorId: value.sensorId,
            tankId: value.tankId,
        };
    });
}


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
  }

  /**
   * @method getHistoricalData
   * @description Modificado para obtener datos y aplicar agregación inteligente (downsampling)
   * antes de enviarlos, solucionando timeouts y mejorando la legibilidad de los gráficos.
   */
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

    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    let intervalSeconds: number;
    if (durationHours <= 3) {
        intervalSeconds = 0;
    } else if (durationHours <= 48) { 
        intervalSeconds = 5 * 60; 
    } else if (durationHours <= 24 * 7) { 
        intervalSeconds = 20 * 60; 
    } else { 
        intervalSeconds = 60 * 60; 
    }

    this.logger.log(`Buscando datos para el tanque ${tankId} en el rango: ${start.toISOString()} hasta ${end.toISOString()}`);
    
    const rawData = await this.prisma.sensorData.findMany({
        where: { tankId: tankId, timestamp: { gte: start, lte: end } },
        orderBy: { timestamp: 'asc' },
    });

    const data = aggregateData(rawData, intervalSeconds);
    
    this.logger.log(`Se encontraron ${rawData.length} registros crudos. Se enviarán ${data.length} puntos agregados.`);
    return { data };
  }

  async submitManualEntry(entries: { sensorId: string; value: number }[]): Promise<any[]> {
    const createdData = [];
    for (const entry of entries) {
      const sensor = await this.prisma.sensor.findUnique({ where: { id: entry.sensorId } });
      if (!sensor) throw new NotFoundException(`El sensor con ID ${entry.sensorId} no fue encontrado.`);
      const data = await this.prisma.sensorData.create({ data: { value: entry.value, type: sensor.type, timestamp: new Date(), sensorId: entry.sensorId, tankId: sensor.tankId, }, include: { sensor: true }, });
      this.eventsGateway.broadcastNewData(data);
      createdData.push(data);
    }
    return createdData;
  }

  async createEntryFromMqtt(data: { sensorId: string; tankId: string; type: SensorType; value: number; }): Promise<SensorData> {
    const createdData = await this.prisma.sensorData.create({ data: { value: data.value, type: data.type, timestamp: new Date(), sensorId: data.sensorId, tankId: data.tankId, }, include: { sensor: true }, });
    this.eventsGateway.broadcastNewData(createdData);
    this.logger.log(`Dato de MQTT guardado para sensor ${data.sensorId} con valor ${data.value}`);
    return createdData as SensorData;
  }
  
  async startEmitters(sensorIds: string[]): Promise<void> {
    for (const sensorId of sensorIds) {
      if (this.activeEmitters.has(sensorId)) continue;
      const sensor = await this.prisma.sensor.findUnique({ where: { id: sensorId }, include: { tank: { include: { user: true } } }, });
      if (!sensor) throw new NotFoundException(`Sensor con ID ${sensorId} no encontrado.`);
      const intervalId = setInterval(() => { const value = this.generateRealisticValue(sensor.type); this.submitManualEntry([{ sensorId, value }]); }, 5000);
      this.activeEmitters.set(sensorId, { intervalId, sensorId: sensor.id, sensorName: sensor.name, type: sensor.type, tankName: sensor.tank.name, userName: sensor.tank.user.name, });
    }
  }

  stopEmitter(sensorId: string): void {
    const emitter = this.activeEmitters.get(sensorId);
    if (emitter) { clearInterval(emitter.intervalId); this.activeEmitters.delete(sensorId); }
  }

  getEmitterStatus() { return Array.from(this.activeEmitters.values()).map(({ intervalId, ...rest }) => rest); }

  private generateRealisticValue(type: SensorType): number {
    switch (type) {
      case 'TEMPERATURE': return 24 + (Math.random() - 0.5) * 5;
      case 'PH': return 7.0 + (Math.random() - 0.5) * 1;
      case 'OXYGEN': return 7.5 + (Math.random() - 0.5) * 2;
      default: return Math.random() * 100;
    }
  }
}