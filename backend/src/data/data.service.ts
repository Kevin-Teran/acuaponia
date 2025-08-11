import { Injectable, NotFoundException, OnModuleDestroy, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SensorData, SensorType, User } from '@prisma/client';

interface ActiveEmitter {
  intervalId: NodeJS.Timeout;
  sensorId: string;
  sensorName: string;
  type: SensorType;
  tankName: string;
  userName: string;
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
  
  async getHistoricalData(user: User, tankId: string, startDate: string, endDate: string): Promise<{ data: SensorData[] }> {
    if (!tankId || !startDate || !endDate) {
      throw new BadRequestException('Faltan los parámetros tankId, startDate o endDate.');
    }

    if (user.role !== 'ADMIN') {
        const tank = await this.prisma.tank.findFirst({ where: { id: tankId, userId: user.id } });
        if (!tank) {
            this.logger.warn(`Intento de acceso denegado del usuario ${user.id} al tanque ${tankId}`);
            throw new ForbiddenException('No tienes permiso para acceder a los datos de este tanque.');
        }
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    this.logger.log(`Buscando datos para el tanque ${tankId} desde ${start.toISOString()} hasta ${end.toISOString()}`);

    const data = await this.prisma.sensorData.findMany({
      where: {
        tankId: tankId,
        timestamp: { gte: start, lte: end },
      },
      orderBy: { timestamp: 'asc' },
    });

    this.logger.log(`Encontrados ${data.length} registros para el tanque ${tankId}.`);
    return { data };
  }

  async submitManualEntry(entries: { sensorId: string; value: number }[]): Promise<any[]> {
    const createdData = [];
    for (const entry of entries) {
      const sensor = await this.prisma.sensor.findUnique({ where: { id: entry.sensorId } });
      if (!sensor) throw new NotFoundException(`El sensor con ID ${entry.sensorId} no fue encontrado.`);

      const data = await this.prisma.sensorData.create({
        data: {
          value: entry.value, type: sensor.type, timestamp: new Date(),
          sensorId: entry.sensorId, tankId: sensor.tankId,
        },
        include: { sensor: true },
      });
      
      this.eventsGateway.broadcastNewData(data);
      createdData.push(data);
    }
    return createdData;
  }

  async startEmitters(sensorIds: string[]): Promise<void> {
    for (const sensorId of sensorIds) {
      if (this.activeEmitters.has(sensorId)) continue;
      const sensor = await this.prisma.sensor.findUnique({
        where: { id: sensorId },
        include: { tank: { include: { user: true } } },
      });
      if (!sensor) throw new NotFoundException(`Sensor con ID ${sensorId} no encontrado.`);
      
      const intervalId = setInterval(() => {
        const value = this.generateRealisticValue(sensor.type);
        this.submitManualEntry([{ sensorId, value }]);
      }, 5000);

      this.activeEmitters.set(sensorId, {
        intervalId, sensorId: sensor.id, sensorName: sensor.name,
        type: sensor.type, tankName: sensor.tank.name, userName: sensor.tank.user.name,
      });
    }
  }

  stopEmitter(sensorId: string): void {
    const emitter = this.activeEmitters.get(sensorId);
    if (emitter) {
      clearInterval(emitter.intervalId);
      this.activeEmitters.delete(sensorId);
    }
  }

  getEmitterStatus() {
    return Array.from(this.activeEmitters.values()).map(({ intervalId, ...rest }) => rest);
  }
  
  private generateRealisticValue(type: SensorType): number {
    switch (type) {
      case 'TEMPERATURE': return 24 + (Math.random() - 0.5) * 5; 
      case 'PH': return 7.0 + (Math.random() - 0.5) * 1;
      case 'OXYGEN': return 7.5 + (Math.random() - 0.5) * 2; 
      default: return Math.random() * 100;
    }
  }
}