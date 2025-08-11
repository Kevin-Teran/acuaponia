import { Injectable, NotFoundException, OnModuleDestroy, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { SensorData, SensorType, User } from '@prisma/client';

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
 * @class DataService
 * @description Servicio que maneja la lógica para obtener datos históricos,
 * inyectar datos manualmente y gestionar simuladores de sensores.
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
   * @description Hook del ciclo de vida de NestJS. Se asegura de detener todos los
   * emisores activos cuando la aplicación se apaga para evitar fugas de memoria.
   */
  onModuleDestroy() {
    this.activeEmitters.forEach(emitter => clearInterval(emitter.intervalId));
  }

  /**
   * @method getHistoricalData
   * @description Obtiene datos históricos de sensores para un tanque y rango de fechas específicos.
   * Valida que el usuario tenga permisos para acceder a los datos del tanque solicitado.
   * @param {User} user - El usuario autenticado que realiza la petición.
   * @param {string} tankId - El ID del tanque a consultar.
   * @param {string} startDate - La fecha de inicio del rango.
   * @param {string} endDate - La fecha de fin del rango.
   * @returns {Promise<{ data: SensorData[] }>} Un objeto que contiene un array con los datos históricos.
   * @throws {BadRequestException} Si faltan parámetros requeridos.
   * @throws {ForbiddenException} Si el usuario no tiene permisos sobre el tanque.
   */
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

  /**
   * @method submitManualEntry
   * @description Registra en la base de datos un conjunto de lecturas manuales de sensores.
   * Este método es llamado por el `DataController` para la inyección de datos vía API.
   * @param {Array<{ sensorId: string; value: number }>} entries - Un array de lecturas a registrar.
   * @returns {Promise<any[]>} Un array con los registros de datos creados.
   * @throws {NotFoundException} Si alguno de los IDs de sensor no se encuentra.
   */
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

  /**
   * @method createEntryFromMqtt
   * @description Crea una única entrada de datos proveniente de un mensaje MQTT.
   * Este método es invocado por el `MqttService` y se encarga de persistir la lectura.
   * @param {object} data - Objeto con los datos del sensor a registrar.
   * @param {string} data.sensorId - El ID del sensor.
   * @param {string} data.tankId - El ID del tanque asociado.
   * @param {SensorType} data.type - El tipo de dato (Temperatura, pH, etc.).
   * @param {number} data.value - El valor de la lectura.
   * @returns {Promise<SensorData>} El registro de dato del sensor creado.
   */
  async createEntryFromMqtt(data: {
    sensorId: string;
    tankId: string;
    type: SensorType;
    value: number;
  }): Promise<SensorData> {
    const createdData = await this.prisma.sensorData.create({
      data: {
        value: data.value,
        type: data.type,
        timestamp: new Date(),
        sensorId: data.sensorId,
        tankId: data.tankId,
      },
      include: { sensor: true },
    });

    this.eventsGateway.broadcastNewData(createdData);
    
    this.logger.log(`Dato de MQTT guardado para sensor ${data.sensorId} con valor ${data.value}`);
    return createdData;
  }

  /**
   * @method startEmitters
   * @description Inicia procesos de simulación en el backend para una lista de sensores.
   * Cada proceso enviará datos cada 5 segundos.
   * @param {string[]} sensorIds - Un array con los IDs de los sensores a simular.
   * @throws {NotFoundException} Si un ID de sensor no es válido.
   */
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

  /**
   * @method stopEmitter
   * @description Detiene una simulación de datos activa para un sensor específico.
   * @param {string} sensorId - El ID del sensor cuya simulación se detendrá.
   */
  stopEmitter(sensorId: string): void {
    const emitter = this.activeEmitters.get(sensorId);
    if (emitter) {
      clearInterval(emitter.intervalId);
      this.activeEmitters.delete(sensorId);
    }
  }

  /**
   * @method getEmitterStatus
   * @description Devuelve una lista de todas las simulaciones que están actualmente activas.
   * @returns {Omit<ActiveEmitter, 'intervalId'>[]} Un array con información de los emisores activos.
   */
  getEmitterStatus() {
    return Array.from(this.activeEmitters.values()).map(({ intervalId, ...rest }) => rest);
  }

  /**
   * @private
   * @method generateRealisticValue
   * @description Genera un valor numérico aleatorio y realista basado en el tipo de sensor.
   * @param {SensorType} type - El tipo de sensor.
   * @returns {number} Un valor simulado.
   */
  private generateRealisticValue(type: SensorType): number {
    switch (type) {
      case 'TEMPERATURE': return 24 + (Math.random() - 0.5) * 5;
      case 'PH': return 7.0 + (Math.random() - 0.5) * 1;
      case 'OXYGEN': return 7.5 + (Math.random() - 0.5) * 2;
      default: return Math.random() * 100;
    }
  }
}