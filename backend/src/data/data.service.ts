/**
 * @file data.service.ts
 * @description Lógica de negocio para la gestión de datos de sensores, con simulación inteligente y manejo optimizado de MQTT.
 * @author Kevin Mariano (Reconstruido y optimizado por Gemini)
 * @version 5.0.0
 * @since 1.0.0
 */
import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { ManualEntryDto } from './dto/manual-entry.dto';
import { GetLatestDataDto } from './dto/get-latest-data.dto';
import { SensorData, SensorType, User, Role } from '@prisma/client';

/**
 * @typedef {Object} SimulationState
 * @description Estados posibles de la simulación de sensores
 */
type SimulationState = 'STABLE' | 'RISING' | 'FALLING';

/**
 * @interface ActiveEmitter
 * @description Estructura que define un emisor de simulación activo
 * @property {NodeJS.Timeout} intervalId - ID del intervalo de Node.js
 * @property {string} sensorId - ID único del sensor en la base de datos
 * @property {string} sensorName - Nombre descriptivo del sensor
 * @property {SensorType} type - Tipo de sensor (TEMPERATURE, PH, OXYGEN)
 * @property {string} tankName - Nombre del tanque al que pertenece
 * @property {string} userName - Nombre del usuario propietario
 * @property {Object} thresholds - Umbrales mínimo y máximo para el sensor
 * @property {number} currentValue - Valor actual de la simulación
 * @property {SimulationState} state - Estado actual de la simulación
 * @property {Date} startTime - Momento en que se inició la simulación
 */
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

/**
 * @constant DEFAULT_THRESHOLDS
 * @description Umbrales por defecto para cada tipo de sensor
 */
const DEFAULT_THRESHOLDS = {
  TEMPERATURE: { min: 22, max: 28 },
  PH: { min: 6.8, max: 7.6 },
  OXYGEN: { min: 6, max: 10 },
};

/**
 * @class DataService
 * @description Servicio principal para el manejo de datos de sensores
 * Incluye funcionalidades de simulación, entrada manual y procesamiento de datos MQTT
 */
@Injectable()
export class DataService implements OnModuleDestroy {
  private readonly activeEmitters = new Map<string, ActiveEmitter>();
  private readonly logger = new Logger(DataService.name);

  constructor(
    private prisma: PrismaService,
    private eventsGateway: EventsGateway,
  ) {}

  /**
   * @method onModuleDestroy
   * @description Método del ciclo de vida que se ejecuta al destruir el módulo
   * Limpia todos los intervalos activos de simulación
   */
  onModuleDestroy() {
    this.activeEmitters.forEach(emitter => {
      clearInterval(emitter.intervalId);
      this.logger.log(`🛑 Simulador detenido para sensor: ${emitter.sensorName}`);
    });
    this.logger.log('✅ Todos los emisores de simulación han sido detenidos correctamente.');
  }

  /**
   * @method createFromMqtt
   * @description Procesa datos recibidos desde MQTT, busca el sensor por hardwareId y guarda la entrada
   * @param {string} hardwareId - El ID de hardware del sensor físico
   * @param {Object} data - El payload con el valor y timestamp
   * @param {number} data.value - Valor de la medición del sensor
   * @param {string} [data.timestamp] - Timestamp opcional (ISO string)
   * @returns {Promise<SensorData>} Los datos creados en la base de datos
   * @throws {NotFoundException} Si el sensor con el hardwareId no se encuentra
   */
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
      const errorMsg = `Sensor con hardwareId "${hardwareId}" no fue encontrado en la base de datos.`;
      this.logger.error(`❌ [MQTT] ${errorMsg}`);
      throw new NotFoundException(errorMsg);
    }

    this.logger.log(`✅ [MQTT] Sensor encontrado: ${sensor.name} (ID: ${sensor.id}) - Tanque: ${sensor.tank.name} - Usuario: ${sensor.tank.user.name}`);

    const timestamp = data.timestamp ? new Date(data.timestamp) : new Date();
    
    if (isNaN(timestamp.getTime())) {
      this.logger.warn(`⚠️ [MQTT] Timestamp inválido recibido, usando timestamp actual`);
      timestamp.setTime(Date.now());
    }

    const sensorData = await this.createAndBroadcastEntry({
      sensorId: sensor.id,
      tankId: sensor.tankId,
      type: sensor.type,
      value: data.value,
      timestamp: timestamp,
    });

    this.logger.log(`💾 [MQTT] Datos guardados exitosamente para sensor ${sensor.name}: ${data.value} ${this.getUnitForType(sensor.type)}`);
    
    return sensorData;
  }

  /**
   * @method submitManualEntry
   * @description Procesa múltiples entradas manuales de datos
   * @param {ManualEntryDto[]} entries - Array de entradas manuales a procesar
   * @returns {Promise<SensorData[]>} Array de datos creados
   * @throws {NotFoundException} Si algún sensor no se encuentra
   */
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
        const errorMsg = `El sensor con ID ${entry.sensorId} no fue encontrado.`;
        this.logger.error(`❌ [MANUAL] ${errorMsg}`);
        throw new NotFoundException(errorMsg);
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
    
    this.logger.log(`🎉 [MANUAL] Se procesaron exitosamente ${createdData.length} entradas manuales`);
    return createdData;
  }
  
  /**
   * @method getLatest
   * @description Obtiene los datos más recientes de sensores filtrados por parámetros
   * @param {GetLatestDataDto} query - Parámetros de consulta (tankId, type)
   * @param {User} user - Usuario que realiza la petición
   * @returns {Promise<SensorData[]>} Array de datos más recientes
   * @throws {BadRequestException} Si falta el parámetro tankId
   * @throws {ForbiddenException} Si el usuario no tiene permisos
   */
  async getLatest(query: GetLatestDataDto, user: User): Promise<SensorData[]> {
    const { tankId, type } = query;
    
    if (!tankId) {
      throw new BadRequestException('El parámetro tankId es requerido para obtener los datos más recientes.');
    }
    
    // Verificar permisos si no es admin
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
      this.logger.log(`📊 No se encontraron sensores para el tanque ${tankId}${type ? ` con tipo ${type}` : ''}`);
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
    
    this.logger.log(`📊 Se obtuvieron ${validResults.length} datos más recientes del tanque ${tankId}`);
    return validResults;
  }

  /**
   * @method getHistoricalData
   * @description Obtiene datos históricos de sensores en un rango de fechas
   * @param {User} user - Usuario que realiza la petición
   * @param {string} tankId - ID del tanque
   * @param {string} startDate - Fecha de inicio (YYYY-MM-DD)
   * @param {string} endDate - Fecha de fin (YYYY-MM-DD)
   * @returns {Promise<{data: SensorData[]}>} Objeto con array de datos históricos
   * @throws {BadRequestException} Si faltan parámetros requeridos
   * @throws {ForbiddenException} Si el usuario no tiene permisos
   */
  async getHistoricalData(user: User, tankId: string, startDate: string, endDate: string): Promise<{ data: SensorData[] }> {
    if (!tankId || !startDate || !endDate) {
      throw new BadRequestException('Los parámetros tankId, startDate y endDate son requeridos para obtener datos históricos.');
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
      throw new BadRequestException('Las fechas proporcionadas no son válidas. Use el formato YYYY-MM-DD.');
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
    
    this.logger.log(`📈 Se obtuvieron ${rawData.length} registros históricos del tanque ${tankId} entre ${startDate} y ${endDate}`);
    return { data: rawData };
  }

  /**
   * @method startEmitters
   * @description Inicia simuladores de datos para los sensores especificados
   * @param {string[]} sensorIds - Array de IDs de sensores para simular
   * @returns {Promise<void>}
   */
  async startEmitters(sensorIds: string[]): Promise<void> {
    this.logger.log(`🚀 [SIMULACIÓN] Iniciando simuladores para ${sensorIds.length} sensores`);
    
    for (const sensorId of sensorIds) {
      if (this.activeEmitters.has(sensorId)) {
        this.logger.warn(`⚠️ [SIMULACIÓN] El sensor ${sensorId} ya tiene un simulador activo`);
        continue;
      }
      
      const sensor = await this.prisma.sensor.findUnique({ 
        where: { id: sensorId }, 
        include: { 
          tank: { 
            include: { 
              user: {
                select: { name: true, settings: true }
              }
            }
          }
        }
      });
      
      if (!sensor) { 
        this.logger.warn(`❌ [SIMULACIÓN] No se encontró el sensor con ID ${sensorId}.`); 
        continue; 
      }
      
      const userSettings = (sensor.tank.user.settings as any)?.thresholds || {};
      const sensorTypeKey = sensor.type;
      const defaultThreshold = DEFAULT_THRESHOLDS[sensorTypeKey];
      const thresholds = { 
        min: userSettings[sensorTypeKey]?.min ?? defaultThreshold.min, 
        max: userSettings[sensorTypeKey]?.max ?? defaultThreshold.max 
      };
      
      let emitterState: ActiveEmitter = { 
        intervalId: null as any, 
        sensorId: sensor.id, 
        sensorName: sensor.name, 
        type: sensor.type, 
        tankName: sensor.tank.name, 
        userName: sensor.tank.user.name, 
        thresholds, 
        currentValue: (thresholds.min + thresholds.max) / 2, 
        state: 'STABLE', 
        startTime: new Date() 
      };
      
      const intervalId = setInterval(async () => {
        try {
          const { currentValue, state } = this.generateRealisticValue(emitterState);
          emitterState.currentValue = currentValue;
          emitterState.state = state;
          
          await this.createAndBroadcastEntry({ 
            sensorId, 
            tankId: sensor.tankId, 
            type: sensor.type, 
            value: currentValue, 
            timestamp: new Date() 
          });
          
        } catch (error) {
          this.logger.error(`❌ [SIMULACIÓN] Error en simulador del sensor ${sensor.name}: ${error.message}`);
        }
      }, 5000); 
      
      emitterState.intervalId = intervalId;
      this.activeEmitters.set(sensorId, emitterState);
      
      this.logger.log(`✅ [SIMULACIÓN] Simulador iniciado para "${sensor.name}" (${sensor.type}) con rango [${thresholds.min}-${thresholds.max}] ${this.getUnitForType(sensor.type)}`);
    }
    
    this.logger.log(`🎉 [SIMULACIÓN] Se iniciaron ${this.activeEmitters.size} simuladores activos`);
  }

  /**
   * @method stopEmitter
   * @description Detiene el simulador de un sensor específico
   * @param {string} sensorId - ID del sensor cuyo simulador se debe detener
   */
  stopEmitter(sensorId: string): void {
    const emitter = this.activeEmitters.get(sensorId);
    if (emitter) { 
      clearInterval(emitter.intervalId); 
      this.activeEmitters.delete(sensorId); 
      this.logger.log(`⏹️ [SIMULACIÓN] Simulador detenido para el sensor "${emitter.sensorName}"`); 
    } else {
      this.logger.warn(`⚠️ [SIMULACIÓN] No se encontró simulador activo para el sensor ${sensorId}`);
    }
  }

  /**
   * @method getEmitterStatus
   * @description Obtiene el estado actual de todos los simuladores activos
   * @returns {Object[]} Array con información de simuladores activos
   */
  getEmitterStatus() {
    const activeSimulators = Array.from(this.activeEmitters.values()).map(({ intervalId, ...rest }) => ({
      ...rest,
      uptime: Math.floor((Date.now() - rest.startTime.getTime()) / 1000), // segundos de actividad
      unit: this.getUnitForType(rest.type)
    }));
    
    this.logger.log(`📊 [SIMULACIÓN] Consultando estado de ${activeSimulators.length} simuladores activos`);
    return activeSimulators;
  }

  /**
   * @method createAndBroadcastEntry
   * @description Crea una nueva entrada de datos en la base de datos y la transmite via WebSocket
   * @param {Object} data - Datos del sensor a guardar
   * @param {string} data.sensorId - ID del sensor
   * @param {string} data.tankId - ID del tanque
   * @param {SensorType} data.type - Tipo del sensor
   * @param {number} data.value - Valor de la medición
   * @param {Date} data.timestamp - Timestamp de la medición
   * @returns {Promise<SensorData>} Los datos creados
   * @private
   */
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
  
  /**
   * @method generateRealisticValue
   * @description Genera valores realistas para la simulación con comportamiento dinámico
   * @param {ActiveEmitter} emitter - Estado actual del emisor
   * @returns {Object} Nuevo valor y estado de la simulación
   * @private
   */
  private generateRealisticValue(emitter: ActiveEmitter): { currentValue: number; state: SimulationState } {
    let { currentValue, state, thresholds, type } = emitter;
    const { min, max } = thresholds;
    const center = (min + max) / 2;
    const range = max - min;
    
    const eventChance = Math.random();
    
    if (state === 'STABLE' && eventChance < 0.02) { 
      state = Math.random() < 0.5 ? 'RISING' : 'FALLING'; 
      this.logger.log(`🎯 [SIMULACIÓN] Evento simulado: "${emitter.sensorName}" ha entrado en estado ${state}`); 
    } else if (state !== 'STABLE' && eventChance < 0.15) { 
      state = 'STABLE'; 
      this.logger.log(`🎯 [SIMULACIÓN] Evento simulado: "${emitter.sensorName}" vuelve a estado STABLE`); 
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

  /**
   * @method getUnitForType
   * @description Obtiene la unidad de medida para un tipo de sensor
   * @param {SensorType} type - Tipo del sensor
   * @returns {string} Unidad de medida correspondiente
   * @private
   */
  private getUnitForType(type: SensorType): string {
    switch (type) {
      case 'TEMPERATURE': return '°C';
      case 'PH': return 'pH';
      case 'OXYGEN': return 'mg/L';
      default: return '';
    }
  }
}