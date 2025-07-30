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

  // Topics a los que el backend se suscribirá. El '+' es un comodín.
  private readonly topics = {
    sensorData: 'sena/acuaponia/sensors/+/data',
    sensorStatus: 'sena/acuaponia/sensors/+/status',
    alerts: 'sena/acuaponia/alerts',
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
      reconnectPeriod: 5000, // Reintentar cada 5 segundos
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
        logger.error('❌ Se alcanzó el máximo de reintentos de conexión MQTT. El servicio se detendrá.');
        this.client?.end(true); // Forzar cierre
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
   * @desc Manejador central de mensajes. Parsea el mensaje y lo delega al handler apropiado.
   * @param {string} topic - El topic del mensaje recibido.
   * @param {Buffer} message - El contenido del mensaje.
   */
  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    const messageStr = message.toString();
    logger.debug(`📨 Mensaje MQTT recibido en ${topic}: ${messageStr}`);
    
    let data;
    try {
      data = JSON.parse(messageStr);
    } catch (parseError) {
      logger.error('❌ Error al parsear mensaje MQTT a JSON:', parseError);
      return;
    }

    if (topic.includes('/sensors/') && topic.endsWith('/data')) {
      await this.handleSensorData(topic, data);
    }
  }

  /**
   * @desc Procesa los paquetes de datos de los sensores con la nueva estructura de BD.
   * @param {string} topic - El topic del que se extrae el ID del sensor.
   * @param {any} data - El payload del mensaje.
   */
  private async handleSensorData(topic: string, data: any): Promise<void> {
    const sensorId = this.extractSensorIdFromTopic(topic);
    if (!sensorId) {
      logger.error('❌ No se pudo extraer el ID del sensor del topic:', topic);
      return;
    }

    // Itera sobre las posibles claves (temperature, ph, oxygen) en el payload
    for (const key of Object.keys(data)) {
      const value = data[key];
      const type = key.toUpperCase();

      // Si la clave es un tipo de sensor válido y tiene un valor numérico
      if (Object.values(SensorType).includes(type as any) && typeof value === 'number') {
        try {
          // --- CORRECCIÓN CLAVE ---
          // Se crea el dato con la nueva estructura (value y type)
          const sensorData = await sensorDataService.createSensorData({
            sensorId,
            type: type as SensorType,
            value: value,
            timestamp: new Date(data.timestamp || Date.now()),
          });

          if (sensorData) {
            // El `sensorData` de retorno ya incluye el tanque, por lo que es seguro emitirlo.
            socketService.emitSensorData(sensorData);
            await alertService.checkThresholds(sensorId, { [key]: value });
          }
        } catch (error) {
          logger.error(`❌ Error procesando dato de ${type} para el sensor ${sensorId}:`, error);
        }
      }
    }
  }

  /**
   * @desc Extrae el ID del sensor a partir del topic MQTT.
   * @param {string} topic - El topic completo.
   * @returns {string | null} El ID del sensor o null si no se encuentra.
   */
  private extractSensorIdFromTopic(topic: string): string | null {
    // Expresión regular ajustada para ser más específica
    const match = topic.match(/sena\/acuaponia\/sensors\/([^/]+)\/data/);
    return match ? match[1] : null;
  }
}

export const mqttService = new MQTTService();

/**
 * @desc Función de conveniencia para inicializar el servicio MQTT en el server.ts.
 */
export function initializeMQTT(): void {
  mqttService.initialize();
}