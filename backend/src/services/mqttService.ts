import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { logger } from '../utils/logger';
import { socketService } from './socketService';
import { sensorDataService } from './sensorDataService';
import { alertService } from './alertService';
import { prisma } from '../config/database';
import { SensorType } from '@prisma/client';

/**
 * @class MQTTService
 * @desc Gestiona la conexión y la comunicación con el broker MQTT.
 * Se encarga de suscribirse a los topics relevantes, manejar los mensajes entrantes
 * y proporcionar un método para publicar mensajes.
 */
class MQTTService {
  private client: MqttClient | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;

  /**
   * @desc Colección de tópicos a los que el servicio se suscribirá.
   * Utiliza comodines MQTT (+) para capturar dinámicamente el ID del hardware.
   */
  private readonly topics = {
    temperature: 'sena/acuaponia/sensors/+/temperature',
    ph: 'sena/acuaponia/sensors/+/ph',
    oxygen: 'sena/acuaponia/sensors/+/oxygen',
    sensorStatus: 'sena/acuaponia/sensors/+/status',
  };

  /**
   * @desc Inicializa y establece la conexión con el broker MQTT.
   */
  public initialize(): void {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const options: IClientOptions = {
      clientId: `sena_acuaponia_backend_${Date.now()}`,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 5000,
    };

    logger.info(`🔌 Intentando conectar al broker MQTT: ${brokerUrl}`);
    this.client = mqtt.connect(brokerUrl, options);

    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      logger.info('✅ Conectado al broker MQTT exitosamente.');
      this.subscribeToTopics();
    });

    this.client.on('error', (error) => {
      logger.error('❌ Error de conexión MQTT:', error.message);
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      logger.warn(`🔄 Reintentando conexión MQTT... (Intento ${this.reconnectAttempts})`);
      if (this.reconnectAttempts > this.maxReconnectAttempts) {
        logger.error('❌ Se alcanzó el máximo de reintentos de conexión MQTT.');
        this.client?.end(true);
      }
    });

    this.client.on('close', () => {
        logger.warn('⚠️ Conexión MQTT cerrada.');
        this.isConnected = false;
    });

    this.client.on('message', this.handleMessage.bind(this));
  }

  /**
   * @desc Se suscribe a todos los topics definidos en la clase.
   */
  private subscribeToTopics(): void {
    if (!this.client) return;
    Object.values(this.topics).forEach(topic => {
      this.client!.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          logger.error(`❌ Error al suscribirse al topic ${topic}:`, err.message);
        } else {
          logger.info(`✅ Suscrito exitosamente al topic: ${topic}`);
        }
      });
    });
  }
  
  /**
   * @desc Publica un mensaje en un topic MQTT específico.
   * @param {string} topic - El topic al que se va a publicar.
   * @param {string | Buffer} message - El mensaje a publicar.
   */
  public publish(topic: string, message: string | Buffer): void {
    if (!this.client || !this.isConnected) {
      logger.error(`❌ No se puede publicar en '${topic}': Cliente MQTT no conectado.`);
      return;
    }
    this.client.publish(topic, message, { qos: 1 }, (error) => {
      if (error) {
        logger.error(`❌ Error al publicar en el topic ${topic}:`, error);
      } else {
        logger.debug(`✅ Mensaje publicado en el topic: ${topic}`);
      }
    });
  }

  /**
   * @desc Manejador principal de mensajes MQTT. Extrae el hardwareId y el tipo de dato
   * del tópico y procesa el mensaje como un valor numérico.
   * @param {string} topic - El topic del mensaje recibido.
   * @param {Buffer} message - El contenido del mensaje.
   */
   private async handleMessage(topic: string, message: Buffer): Promise<void> {
    const messageStr = message.toString();
    logger.debug(`📨 Mensaje MQTT recibido en ${topic}: ${messageStr}`);

    const topicParts = topic.split('/');
    if (topicParts.length < 5 || topicParts[2] !== 'sensors') return;

    const hardwareId = topicParts[3];
    const dataType = topicParts[4].toUpperCase() as SensorType;

    if (!Object.values(SensorType).includes(dataType)) return;

    const value = parseFloat(messageStr);
    if (isNaN(value)) {
      logger.error(`❌ El mensaje en ${topic} no es un número válido: ${messageStr}`);
      return;
    }

    await this.processSingleSensorData(hardwareId, dataType, value);
  }
  
  /**
   * @desc Procesa y guarda un único dato de sensor. Busca el sensor en la BD por su hardwareId.
   * @param {string} hardwareId - El identificador único del dispositivo físico.
   * @param {SensorType} type - El tipo de dato (TEMPERATURE, PH, OXYGEN).
   * @param {number} value - El valor numérico de la lectura.
   */
  private async processSingleSensorData(hardwareId: string, type: SensorType, value: number): Promise<void> {
    try {
      const sensor = await prisma.sensor.findUnique({ where: { hardwareId } });

      if (!sensor) {
        logger.warn(`⚠️ Dato recibido para un hardwareId no registrado: ${hardwareId}`);
        return;
      }

      const sensorData = await sensorDataService.createSensorData({
        sensorId: sensor.id,
        type,
        value,
        timestamp: new Date(),
      });

      if (sensorData) {
        socketService.emitSensorData(sensorData);
        const dataForAlertCheck = { [type.toLowerCase()]: value };
        await alertService.checkThresholds(sensor.id, dataForAlertCheck);
      }
    } catch (error) {
      logger.error(`❌ Error procesando dato de ${type} para el hardware ${hardwareId}:`, error);
    }
  }
}

export const mqttService = new MQTTService();

/**
 * @desc Función de conveniencia para inicializar el servicio MQTT en el `server.ts`.
 */
export function initializeMQTT(): void {
  mqttService.initialize();
}
