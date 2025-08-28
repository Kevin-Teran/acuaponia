/**
 * @file data.service.ts
 * @description Servicio mejorado para gestión persistente de simulaciones de sensores (sin cambios en BD).
 * @author Kevin Mariano 
 * @version 6.0.0
 * @since 1.0.0
 */
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { ManualEntryDto } from './dto/manual-entry.dto';
import { GetLatestDataDto } from './dto/get-latest-data.dto';
import { SensorData, SensorType, User, Role } from '@prisma/client';

type SimulationState = 'STABLE' | 'RISING' | 'FALLING';

interface ActiveEmitter {
  intervalId: NodeJS.Timeout;
  sensorId: string;
  sensorName: string;
  type: SensorType;
  tankId: string;
  tankName: string;
  userName: string;
  userId: string;
  thresholds: { min: number; max: number };
  currentValue: number;
  state: SimulationState;
  startTime: Date;
  messagesCount: number;
  isPersistent: boolean;
}

// Exportar la interfaz para evitar el error de TypeScript
export interface SimulationMetrics {
  totalActiveSimulations: number;
  totalMessagesSent: number;
  averageUptime: number;
  simulationsByType: Record<SensorType, number>;
  simulationsByUser: Record<string, number>;
  systemUptime: number;
}

// Simulación de persistencia en memoria (sin BD)
interface InMemorySimulationCache {
  [sensorId: string]: {
    isActive: boolean;
    startTime: Date;
    messagesCount: number;
    currentValue: number;
    state: SimulationState;
  };
}

const DEFAULT_THRESHOLDS = {
  TEMPERATURE: { min: 22, max: 28 },
  PH: { min: 6.8, max: 7.6 },
  OXYGEN: { min: 6, max: 10 },
};

@Injectable()
export class DataService implements OnModuleInit, OnModuleDestroy {
  private readonly activeEmitters = new Map<string, ActiveEmitter>();
  private readonly logger = new Logger(DataService.name);
  private readonly serviceStartTime = new Date();
  
  // Cache en memoria para simular persistencia
  private readonly simulationCache: InMemorySimulationCache = {};

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 [INIT] Inicializando servicio de datos con simulaciones en memoria...');
    // No restauramos simulaciones automáticamente para evitar conflictos
    this.logger.log('✅ [INIT] Servicio de datos inicializado correctamente');
  }

  onModuleDestroy() {
    this.logger.log('🛑 [SHUTDOWN] Guardando estado y deteniendo simulaciones...');
    
    // Guardar estado en cache antes de detener
    this.activeEmitters.forEach((emitter, sensorId) => {
      this.simulationCache[sensorId] = {
        isActive: true,
        startTime: emitter.startTime,
        messagesCount: emitter.messagesCount,
        currentValue: emitter.currentValue,
        state: emitter.state
      };
      clearInterval(emitter.intervalId);
      this.logger.log(`⏹️ Estado guardado para: ${emitter.sensorName}`);
    });
    
    this.logger.log('✅ [SHUTDOWN] Estados guardados y simulaciones detenidas');
  }

  async createFromMqtt(hardwareId: string, data: { value: number; timestamp?: string }): Promise<SensorData> {
    this.logger.log(`📡 [MQTT] Procesando datos para hardwareId: ${hardwareId}`);
    
    const sensor = await this.prisma.sensor.findUnique({ 
      where: { hardwareId },
      include: {
        tank: {
          include: {
            user: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!sensor) {
      const errorMsg = `Sensor con hardwareId "${hardwareId}" no fue encontrado.`;
      this.logger.error(`❌ [MQTT] ${errorMsg}`);
      throw new NotFoundException(errorMsg);
    }

    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
    
    if (isNaN(timestamp.getTime())) {
      this.logger.warn(`⚠️ [MQTT] Timestamp inválido, usando timestamp actual`);
      timestamp.setTime(Date.now());
    }

    const sensorData = await this.createAndBroadcastEntry({
      sensorId: sensor.id,
      tankId: sensor.tankId,
      type: sensor.type,
      value: data.value,
      timestamp: timestamp,
    });

    // Actualizar contador si es una simulación activa
    const activeEmitter = this.activeEmitters.get(sensor.id);
    if (activeEmitter) {
      activeEmitter.messagesCount++;
    }

    this.logger.log(`💾 [MQTT] Datos guardados para ${sensor.name}: ${data.value} ${this.getUnitForType(sensor.type)}`);
    
    return sensorData;
  }

  async submitManualEntry(entries: ManualEntryDto[]): Promise<SensorData[]> {
    this.logger.log(`📝 [MANUAL] Procesando ${entries.length} entradas manuales`);
    
    const createdData: SensorData[] = [];
    
    for (const entry of entries) {
      const sensor = await this.prisma.sensor.findUnique({ 
        where: { id: entry.sensorId },
        include: {
          tank: {
            include: {
              user: {
                select: { name: true }
              }
            }
          }
        }
      });
      
      if (!sensor) {
        throw new NotFoundException(`Sensor con ID ${entry.sensorId} no encontrado.`);
      }
      
      const timestamp = entry.timestamp || new Date();
      
      const data = await this.createAndBroadcastEntry({
        sensorId: entry.sensorId,
        tankId: sensor.tankId,
        type: sensor.type,
        value: entry.value,
        timestamp: timestamp,
      });
      
      createdData.push(data);
      this.logger.log(`✅ [MANUAL] Entrada guardada para ${sensor.name}: ${entry.value} ${this.getUnitForType(sensor.type)}`);
    }
    
    return createdData;
  }
  
  async getLatest(query: GetLatestDataDto, user: User): Promise<SensorData[]> {
    const { tankId, type } = query;
    
    if (!tankId) {
      throw new BadRequestException('El parámetro tankId es requerido.');
    }
    
    if (user.role !== 'ADMIN') {
      const tank = await this.prisma.tank.findFirst({ 
        where: { id: tankId, userId: user.id } 
      });
      if (!tank) {
        throw new ForbiddenException('No tienes permiso para acceder a los datos de este tanque.');
      }
    }
    
    const whereCondition: any = { tankId };
    if (type) {
      whereCondition.type = type;
    }
    
    const sensors = await this.prisma.sensor.findMany({ 
      where: whereCondition, 
      select: { id: true, name: true, type: true }
    });
    
    if (sensors.length === 0) {
      return [];
    }
    
    const sensorIds = sensors.map(s => s.id);
    
    const latestDataPromises = sensorIds.map(sensorId =>
      this.prisma.sensorData.findFirst({
        where: { sensorId },
        orderBy: { timestamp: 'desc' },
        include: { 
          sensor: {
            select: {
              id: true,
              name: true,
              type: true,
              hardwareId: true,
              lastReading: true,
              lastUpdate: true
            }
          }
        },
      })
    );
    
    const results = await Promise.all(latestDataPromises);
    const validResults = results.filter(Boolean) as SensorData[];
    
    return validResults;
  }

  async getHistoricalData(user: User, tankId: string, startDate: string, endDate: string): Promise<{ data: SensorData[] }> {
    if (!tankId || !startDate || !endDate) {
      throw new BadRequestException('Los parámetros tankId, startDate y endDate son requeridos.');
    }
    
    if (user.role !== 'ADMIN') {
      const tank = await this.prisma.tank.findFirst({ 
        where: { id: tankId, userId: user.id } 
      });
      if (!tank) {
        throw new ForbiddenException('No tienes permiso para acceder a los datos históricos de este tanque.');
      }
    }
    
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Las fechas no son válidas. Use formato YYYY-MM-DD.');
    }
    
    if (start > end) {
      throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin.');
    }
    
    const rawData = await this.prisma.sensorData.findMany({
      where: { 
        sensor: { tankId }, 
        timestamp: { gte: start, lte: end } 
      },
      orderBy: { timestamp: 'asc' },
      include: { 
        sensor: {
          select: {
            id: true,
            name: true,
            type: true,
            hardwareId: true
          }
        }
      }
    });
    
    return { data: rawData };
  }

  async startEmitters(sensorIds: string[], user: User): Promise<{ started: string[]; skipped: string[]; errors: string[] }> {
    this.logger.log(`🚀 [SIMULATION] Usuario ${user.name} iniciando ${sensorIds.length} simuladores`);
    
    const results = {
      started: [] as string[],
      skipped: [] as string[],
      errors: [] as string[]
    };
    
    for (const sensorId of sensorIds) {
      try {
        if (this.activeEmitters.has(sensorId)) {
          this.logger.warn(`⚠️ [SIMULATION] Sensor ${sensorId} ya tiene simulador activo`);
          results.skipped.push(sensorId);
          continue;
        }
        
        const sensor = await this.prisma.sensor.findUnique({ 
          where: { id: sensorId }, 
          include: { 
            tank: { 
              include: { 
                user: {
                  select: { id: true, name: true, settings: true }
                }
              }
            }
          }
        });
        
        if (!sensor) { 
          this.logger.warn(`❌ [SIMULATION] Sensor ${sensorId} no encontrado`); 
          results.errors.push(`Sensor ${sensorId} no encontrado`);
          continue; 
        }

        // Verificar permisos
        if (user.role !== 'ADMIN' && sensor.tank.userId !== user.id) {
          this.logger.warn(`🚫 [SIMULATION] Usuario ${user.name} sin permisos para sensor ${sensorId}`);
          results.errors.push(`Sin permisos para sensor ${sensorId}`);
          continue;
        }
        
        const userSettings = (sensor.tank.user.settings as any)?.thresholds || {};
        const sensorTypeKey = sensor.type;
        const defaultThreshold = DEFAULT_THRESHOLDS[sensorTypeKey];
        const thresholds = { 
          min: userSettings[sensorTypeKey]?.min ?? defaultThreshold.min, 
          max: userSettings[sensorTypeKey]?.max ?? defaultThreshold.max 
        };
        
        // Verificar si hay estado previo en cache
        const cachedState = this.simulationCache[sensorId];
        const initialValue = cachedState?.currentValue || (thresholds.min + thresholds.max) / 2;
        
        let emitterState: ActiveEmitter = { 
          intervalId: null as any, 
          sensorId: sensor.id, 
          sensorName: sensor.name, 
          type: sensor.type, 
          tankId: sensor.tankId,
          tankName: sensor.tank.name, 
          userName: sensor.tank.user.name,
          userId: sensor.tank.user.id, 
          thresholds, 
          currentValue: initialValue, 
          state: cachedState?.state || 'STABLE', 
          startTime: new Date(),
          messagesCount: cachedState?.messagesCount || 0,
          isPersistent: true
        };
        
        const intervalId = setInterval(async () => {
          try {
            const { currentValue, state } = this.generateRealisticValue(emitterState);
            emitterState.currentValue = currentValue;
            emitterState.state = state;
            emitterState.messagesCount++;
            
            await this.createAndBroadcastEntry({ 
              sensorId, 
              tankId: sensor.tankId, 
              type: sensor.type, 
              value: currentValue, 
              timestamp: new Date() 
            });
            
          } catch (error) {
            this.logger.error(`❌ [SIMULATION] Error en simulador ${sensor.name}: ${error.message}`);
          }
        }, 5000); 
        
        emitterState.intervalId = intervalId;
        this.activeEmitters.set(sensorId, emitterState);
        
        results.started.push(sensorId);
        this.logger.log(`✅ [SIMULATION] Simulador iniciado para "${sensor.name}" por ${user.name}`);
        
      } catch (error) {
        this.logger.error(`❌ [SIMULATION] Error iniciando simulador ${sensorId}:`, error);
        results.errors.push(`Error en sensor ${sensorId}: ${error.message}`);
      }
    }
    
    this.logger.log(`🎉 [SIMULATION] Resumen - Iniciados: ${results.started.length}, Omitidos: ${results.skipped.length}, Errores: ${results.errors.length}`);
    return results;
  }

  stopEmitter(sensorId: string, user: User): void {
    const emitter = this.activeEmitters.get(sensorId);
    if (emitter) { 
      // Verificar permisos
      if (user.role !== 'ADMIN' && emitter.userId !== user.id) {
        throw new ForbiddenException('No tienes permiso para detener este simulador.');
      }

      // Guardar estado en cache antes de detener
      this.simulationCache[sensorId] = {
        isActive: false,
        startTime: emitter.startTime,
        messagesCount: emitter.messagesCount,
        currentValue: emitter.currentValue,
        state: emitter.state
      };

      clearInterval(emitter.intervalId); 
      this.activeEmitters.delete(sensorId); 
      this.logger.log(`⏹️ [SIMULATION] Simulador detenido para "${emitter.sensorName}" por ${user.name}`); 
    } else {
      this.logger.warn(`⚠️ [SIMULATION] No se encontró simulador activo para sensor ${sensorId}`);
    }
  }

  async stopMultipleEmitters(sensorIds: string[], user: User): Promise<{ stopped: string[]; notFound: string[]; noPermission: string[] }> {
    const results = {
      stopped: [] as string[],
      notFound: [] as string[],
      noPermission: [] as string[]
    };

    for (const sensorId of sensorIds) {
      try {
        const emitter = this.activeEmitters.get(sensorId);
        if (!emitter) {
          results.notFound.push(sensorId);
          continue;
        }

        if (user.role !== 'ADMIN' && emitter.userId !== user.id) {
          results.noPermission.push(sensorId);
          continue;
        }

        // Guardar estado en cache
        this.simulationCache[sensorId] = {
          isActive: false,
          startTime: emitter.startTime,
          messagesCount: emitter.messagesCount,
          currentValue: emitter.currentValue,
          state: emitter.state
        };

        clearInterval(emitter.intervalId);
        this.activeEmitters.delete(sensorId);
        results.stopped.push(sensorId);
        
      } catch (error) {
        this.logger.error(`❌ Error deteniendo simulador ${sensorId}:`, error);
        results.notFound.push(sensorId);
      }
    }

    this.logger.log(`🛑 [SIMULATION] Detenidos ${results.stopped.length} simuladores por ${user.name}`);
    return results;
  }

  async restartEmitters(sensorIds: string[], user: User): Promise<{ restarted: string[]; errors: string[] }> {
    this.logger.log(`🔄 [SIMULATION] Reiniciando ${sensorIds.length} simuladores...`);
    
    // Primero detener los existentes
    const stopResults = await this.stopMultipleEmitters(sensorIds, user);
    
    // Luego iniciar los nuevos
    const startResults = await this.startEmitters(sensorIds, user);
    
    return {
      restarted: startResults.started,
      errors: [...stopResults.noPermission, ...startResults.errors]
    };
  }

  getEmitterStatus(user: User) {
    const userSimulations = Array.from(this.activeEmitters.values())
      .filter(emitter => user.role === 'ADMIN' || emitter.userId === user.id)
      .map(({ intervalId, ...rest }) => ({
        ...rest,
        uptime: Math.floor((Date.now() - rest.startTime.getTime()) / 1000),
        unit: this.getUnitForType(rest.type),
        messagesPerMinute: rest.messagesCount > 0 ? 
          Math.round(rest.messagesCount / ((Date.now() - rest.startTime.getTime()) / 60000)) : 0
      }));
    
    return userSimulations;
  }

  getSimulationMetrics(user: User): SimulationMetrics {
    const userSimulations = Array.from(this.activeEmitters.values())
      .filter(emitter => user.role === 'ADMIN' || emitter.userId === user.id);
    
    const totalMessages = userSimulations.reduce((sum, sim) => sum + sim.messagesCount, 0);
    const averageUptime = userSimulations.length > 0 
      ? userSimulations.reduce((sum, sim) => sum + (Date.now() - sim.startTime.getTime()), 0) / userSimulations.length / 1000
      : 0;
    
    const simulationsByType = userSimulations.reduce((acc, sim) => {
      acc[sim.type] = (acc[sim.type] || 0) + 1;
      return acc;
    }, {} as Record<SensorType, number>);
    
    const simulationsByUser = userSimulations.reduce((acc, sim) => {
      acc[sim.userName] = (acc[sim.userName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalActiveSimulations: userSimulations.length,
      totalMessagesSent: totalMessages,
      averageUptime: Math.floor(averageUptime),
      simulationsByType,
      simulationsByUser,
      systemUptime: Math.floor((Date.now() - this.serviceStartTime.getTime()) / 1000)
    };
  }

  private async createAndBroadcastEntry(data: { sensorId: string; tankId: string; type: SensorType; value: number; timestamp: Date }): Promise<SensorData> {
    const { sensorId, tankId, type, value, timestamp } = data;
    
    const createdData = await this.prisma.sensorData.create({
      data: { value, timestamp, sensorId, tankId, type },
      include: { 
        sensor: {
          select: {
            id: true,
            name: true,
            type: true,
            hardwareId: true,
            lastReading: true,
            lastUpdate: true
          }
        }
      },
    });
    
    await this.prisma.sensor.update({ 
      where: { id: sensorId }, 
      data: { 
        lastReading: value, 
        lastUpdate: timestamp 
      } 
    });
    
    this.eventsGateway.broadcastNewData(createdData);
    
    return createdData as SensorData;
  }
  
  private generateRealisticValue(emitter: ActiveEmitter): { currentValue: number; state: SimulationState } {
    let { currentValue, state, thresholds, type } = emitter;
    const { min, max } = thresholds;
    const center = (min + max) / 2;
    const range = max - min;
    
    const eventChance = Math.random();
    
    if (state === 'STABLE' && eventChance < 0.02) { 
      state = Math.random() < 0.5 ? 'RISING' : 'FALLING'; 
    } else if (state !== 'STABLE' && eventChance < 0.15) { 
      state = 'STABLE'; 
    }
    
    let target = center;
    let volatility = range * 0.05;
    
    if (state === 'RISING') { 
      target = max + range * 0.2; 
      volatility = range * 0.1; 
    } else if (state === 'FALLING') { 
      target = min - range * 0.2; 
      volatility = range * 0.1; 
    }
    
    const pull = (target - currentValue) * 0.25;
    const randomStep = (Math.random() - 0.5) * volatility;
    let nextValue = currentValue + pull + randomStep;
    
    const absoluteLimit = range * 2;
    nextValue = Math.max(min - absoluteLimit, Math.min(nextValue, max + absoluteLimit));
    
    const precision = (type === 'PH') ? 2 : 1;
    currentValue = parseFloat(nextValue.toFixed(precision));
    
    return { currentValue, state };
  }

  private getUnitForType(type: SensorType): string {
    switch (type) {
      case 'TEMPERATURE': return '°C';
      case 'PH': return 'pH';
      case 'OXYGEN': return 'mg/L';
      default: return '';
    }
  }
}