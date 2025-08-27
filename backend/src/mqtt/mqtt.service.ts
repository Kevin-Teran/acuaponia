/**
 * @file mqtt.service.ts
 * @description Servicio robusto para gestionar la conexión y comunicación con el broker MQTT.
 * Maneja de forma flexible múltiples formatos de payload (JSON con 'value' o valor numérico directo).
 * @author Kevin Mariano (Corregido y optimizado por Gemini)
 * @version 3.0.2 (Manejo flexible de payload)
 * @since 1.0.0
 */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { connect, MqttClient, IClientOptions, ISubscriptionGrant } from 'mqtt';
import { DataService } from '../data/data.service';
import { ConfigService } from '@nestjs/config';

/**
 * @interface MqttMessage
 * @description Estructura esperada del mensaje MQTT si es un objeto JSON.
 * @property {number|string} value - Valor del sensor.
 * @property {string} [timestamp] - Timestamp opcional en formato ISO.
 */
interface MqttMessage {
  value: number | string;
  timestamp?: string;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient;
  private readonly topicPattern = '+'; // Escucha todos los hardwareId directamente.
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private isConnected = false;

  constructor(
    private readonly dataService: DataService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @method onModuleInit
   * @description Método del ciclo de vida que inicializa la conexión MQTT al arrancar el módulo.
   */
  async onModuleInit(): Promise<void> {
    await this.initializeMqttConnection();
  }

  /**
   * @method onModuleDestroy
   * @description Método del ciclo de vida que cierra la conexión MQTT al destruir el módulo.
   */
  onModuleDestroy(): void {
    this.disconnectMqtt();
  }

  /**
   * @method initializeMqttConnection
   * @description Inicializa y configura la conexión con el broker MQTT.
   * @private
   */
  private async initializeMqttConnection(): Promise<void> {
    const connectUrl = this.configService.get<string>('MQTT_BROKER_URL');
    const username = this.configService.get<string>('MQTT_USERNAME');
    const password = this.configService.get<string>('MQTT_PASSWORD');
    const clientId = `nest-acuaponia-${Math.random().toString(16).slice(2, 8)}`;

    if (!connectUrl) {
      this.logger.error('❌ La variable de entorno MQTT_BROKER_URL no está definida. El servicio MQTT no se iniciará.');
      return;
    }

    this.logger.log(`🔄 Iniciando conexión MQTT a: ${connectUrl}`);

    const options: IClientOptions = {
      clientId,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 5000,
      keepalive: 30,
      username,
      password,
      will: {
        topic: 'acuaponia/status/backend',
        payload: 'offline',
        qos: 1,
        retain: false
      }
    };

    try {
      this.client = connect(connectUrl, options);
      this.setupEventHandlers();
    } catch (error) {
      this.logger.error(`❌ Error al crear cliente MQTT: ${error.message}`);
    }
  }

  /**
   * @method setupEventHandlers
   * @description Configura los manejadores de eventos del cliente MQTT.
   * @private
   */
  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log('✅ Conectado exitosamente al Broker MQTT');
      this.subscribeToTopics();
      this.publishStatus('online');
    });

    this.client.on('message', (topic, payload) => {
      this.handleSensorMessage(topic, payload.toString());
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      this.logger.error(`❌ Error de conexión MQTT: ${err.message}`);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      this.logger.warn('🔌 Desconectado del broker MQTT');
    });

    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      this.logger.log(`🔄 Intentando reconectar... (Intento ${this.reconnectAttempts})`);
    });
  }

  /**
   * @method subscribeToTopics
   * @description Se suscribe a los topics para recibir datos de sensores.
   * @private
   */
  private subscribeToTopics(): void {
    this.client.subscribe(this.topicPattern, { qos: 1 }, (err, granted) => {
      if (err) {
        this.logger.error(`❌ No se pudo suscribir al patrón "${this.topicPattern}":`, err);
      } else {
        this.logger.log(`👍 Suscripción exitosa al patrón: "${granted[0].topic}" con QoS ${granted[0].qos}`);
      }
    });
  }

  /**
   * @method handleSensorMessage
   * @description Procesa los mensajes MQTT recibidos, aceptando JSON o valores directos.
   * @param {string} topic - El hardwareId del sensor.
   * @param {string} message - El payload del mensaje.
   * @private
   */
  private async handleSensorMessage(topic: string, message: string): Promise<void> {
    const hardwareId = topic.trim();
    if (!hardwareId) {
      this.logger.warn(`⚠️ [MQTT] Mensaje recibido en un topic vacío. Mensaje: ${message}`);
      return;
    }

    this.logger.log(`📨 [MQTT] Mensaje recibido en topic: "${hardwareId}" | Payload: "${message}"`);

    let rawValue: number | string | undefined;
    let timestamp: string | undefined;

    try {
      const parsed = JSON.parse(message);
      if (typeof parsed === 'object' && parsed !== null && 'value' in parsed) {
        rawValue = parsed.value;
        timestamp = parsed.timestamp;
      } else {
        rawValue = parsed;
      }
    } catch (e) {
      rawValue = message;
    }

    const numericValue = parseFloat(rawValue as string);

    if (isNaN(numericValue)) {
      this.logger.warn(`⚠️ [MQTT] Valor inválido para ${hardwareId}. Recibido: "${rawValue}"`);
      return;
    }

    const data = {
      value: numericValue,
      timestamp: timestamp,
    };

    try {
      await this.dataService.createFromMqtt(hardwareId, data);
    } catch (error) {
      this.logger.error(`💥 [MQTT] Error al procesar datos para "${hardwareId}": ${error.message}`);
    }
  }

  /**
   * @method publishStatus
   * @description Publica el estado del servicio en MQTT.
   * @param {'online' | 'offline'} status - El estado a publicar.
   * @private
   */
  private publishStatus(status: 'online' | 'offline'): void {
    if (this.client?.connected) {
      this.client.publish('acuaponia/status/backend', status, { qos: 1, retain: true });
    }
  }

  /**
   * @method disconnectMqtt
   * @description Desconecta limpiamente del broker MQTT.
   * @private
   */
  private disconnectMqtt(): void {
    if (this.client) {
      this.logger.log('🔄 Cerrando conexión MQTT...');
      this.publishStatus('offline');
      this.client.end(true, () => {
        this.logger.log('✅ Conexión MQTT cerrada correctamente');
      });
    }
  }
}