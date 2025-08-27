/**
 * @file mqtt.service.ts
 * @description Servicio optimizado para gestionar la conexión y comunicación con el broker MQTT.
 * Maneja el nuevo formato de topic simplificado y procesamiento robusto de mensajes.
 * @author Kevin Mariano (Reconstruido y optimizado por Gemini)
 * @version 3.0.1
 * @since 1.0.0
 */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { connect, MqttClient, IClientOptions, ISubscriptionGrant } from 'mqtt';
import { DataService } from '../data/data.service';
import { ConfigService } from '@nestjs/config';

/**
 * @interface MqttMessage
 * @description Estructura esperada del mensaje MQTT
 * @property {number|string} value - Valor del sensor (se convertirá a número)
 * @property {string} [timestamp] - Timestamp opcional en formato ISO
 * @property {string} [unit] - Unidad de medida opcional
 */
interface MqttMessage {
  value: number | string;
  timestamp?: string;
  unit?: string;
}

/**
 * @class MqttService
 * @description Servicio principal para el manejo de comunicación MQTT
 * Gestiona conexión, suscripciones y procesamiento de mensajes de sensores
 */
@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient;
  private readonly topicPattern = '+'; // Escucha todos los hardwareId directamente
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private isConnected = false;

  constructor(
    private readonly dataService: DataService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @method onModuleInit
   * @description Método del ciclo de vida que inicializa la conexión MQTT al arrancar el módulo
   */
  async onModuleInit(): Promise<void> {
    await this.initializeMqttConnection();
  }

  /**
   * @method onModuleDestroy
   * @description Método del ciclo de vida que cierra la conexión MQTT al destruir el módulo
   */
  onModuleDestroy(): void {
    this.disconnectMqtt();
  }

  /**
   * @method initializeMqttConnection
   * @description Inicializa y configura la conexión con el broker MQTT
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
   * @description Configura los manejadores de eventos del cliente MQTT
   * @private
   */
  private setupEventHandlers(): void {
    // Evento de conexión exitosa
    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log('✅ Conectado exitosamente al Broker MQTT');
      this.subscribeToTopics();
      this.publishStatus('online');
    });

    // Evento de mensaje recibido
    this.client.on('message', (topic, payload) => {
      this.handleSensorMessage(topic, payload.toString());
    });

    // Evento de error de conexión
    this.client.on('error', (err) => {
      this.isConnected = false;
      this.logger.error(`❌ Error de conexión MQTT: ${err.message}`);
      this.handleConnectionError();
    });

    // Evento de desconexión
    this.client.on('close', () => {
      this.isConnected = false;
      this.logger.warn('🔌 Desconectado del broker MQTT');
    });

    // Evento de reconexión
    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.logger.log(`🔄 Intentando reconectar... (Intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      }
    });
  }

  /**
   * @method subscribeToTopics
   * @description Se suscribe a los topics necesarios para recibir datos de sensores
   * Formato del topic: {hardwareId} (directamente el ID del hardware)
   * @private
   */
  private subscribeToTopics(): void {
    const topic = this.topicPattern; // Escucha todos los hardwareId
    
    this.client.subscribe(topic, { qos: 1 }, (err, granted: ISubscriptionGrant[]) => {
      if (!err && granted) {
        this.logger.log(`📡 Solicitud de suscripción enviada para el patrón: "${topic}"`);
        granted.forEach(sub => {
            this.logger.log(`👍 Suscripción confirmada al topic: ${sub.topic} (QoS: ${sub.qos})`);
        });
        this.logger.log('🎯 Formato esperado de topics: {hardwareId}');
        this.logger.log('📋 Ejemplo: "TEMP001", "PH002", "OX003"');
      } else {
        this.logger.error(`❌ No se pudo suscribir al topic "${topic}":`, err);
      }
    });
  }

  /**
   * @method handleSensorMessage
   * @description Procesa los mensajes MQTT recibidos de los sensores
   * @param {string} topic - Topic del mensaje (debe ser el hardwareId del sensor)
   * @param {string} message - Payload del mensaje en formato JSON
   * @private
   */
  private async handleSensorMessage(topic: string, message: string): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`📨 [MQTT] Mensaje recibido en topic: "${topic}"`);
    
    try {
      // El topic es directamente el hardwareId
      const hardwareId = topic.trim();
      
      if (!hardwareId) {
        this.logger.warn(`⚠️ [MQTT] Topic vacío o inválido: "${topic}"`);
        return;
      }

      // Parsear el mensaje JSON
      let parsedMessage: MqttMessage;
      try {
        parsedMessage = JSON.parse(message);
      } catch (parseError) {
        this.logger.error(`❌ [MQTT] Error al parsear JSON del topic "${topic}": ${parseError.message}`);
        this.logger.debug(`🔍 [MQTT] Contenido del mensaje: ${message}`);
        return;
      }

      // Validar y convertir el valor
      const rawValue = parsedMessage.value;
      let numericValue: number;

      if (typeof rawValue === 'string') {
        numericValue = parseFloat(rawValue);
      } else if (typeof rawValue === 'number') {
        numericValue = rawValue;
      } else {
        this.logger.warn(`⚠️ [MQTT] Tipo de valor inválido para ${hardwareId}. Recibido: ${typeof rawValue}, Valor: ${rawValue}`);
        return;
      }

      if (isNaN(numericValue)) {
        this.logger.warn(`⚠️ [MQTT] Valor numérico inválido para ${hardwareId}: "${rawValue}"`);
        return;
      }

      // Validar rango de valor (opcional)
      if (!this.isValueInReasonableRange(numericValue)) {
        this.logger.warn(`⚠️ [MQTT] Valor fuera de rango razonable para ${hardwareId}: ${numericValue}`);
      }

      // Procesar timestamp
      let timestamp: Date;
      if (parsedMessage.timestamp) {
        timestamp = new Date(parsedMessage.timestamp);
        if (isNaN(timestamp.getTime())) {
          this.logger.warn(`⚠️ [MQTT] Timestamp inválido para ${hardwareId}, usando timestamp actual`);
          timestamp = new Date();
        }
      } else {
        timestamp = new Date();
      }

      // Preparar datos para el servicio
      const sensorData = {
        value: numericValue,
        timestamp: timestamp.toISOString()
      };

      this.logger.log(`🔍 [MQTT] Procesando datos del sensor "${hardwareId}": ${numericValue}${parsedMessage.unit || ''} @ ${timestamp.toISOString()}`);

      // Enviar al servicio de datos para procesar
      await this.dataService.createFromMqtt(hardwareId, sensorData);

      const processingTime = Date.now() - startTime;
      this.logger.log(`✅ [MQTT] Mensaje procesado exitosamente para "${hardwareId}" en ${processingTime}ms`);

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`💥 [MQTT] Error procesando mensaje del topic "${topic}" (${processingTime}ms): ${error.message}`);
      
      // Log adicional para debugging
      if (error.stack) {
        this.logger.debug(`🔍 [MQTT] Stack trace: ${error.stack}`);
      }
    }
  }

  /**
   * @method isValueInReasonableRange
   * @description Verifica si un valor está dentro de rangos razonables
   * @param {number} value - Valor a verificar
   * @returns {boolean} True si el valor está en rango razonable
   * @private
   */
  private isValueInReasonableRange(value: number): boolean {
    // Rangos amplios para validación básica
    const ranges = {
      temperature: { min: -50, max: 100 }, // °C
      ph: { min: 0, max: 14 }, // pH
      oxygen: { min: 0, max: 50 }, // mg/L
      general: { min: -1000, max: 1000 } // Rango general
    };

    // Verificación general (se puede refinar por tipo de sensor si es necesario)
    return value >= ranges.general.min && value <= ranges.general.max;
  }

  /**
   * @method handleConnectionError
   * @description Maneja errores de conexión y implementa lógica de reconexión
   * @private
   */
  private handleConnectionError(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`❌ Se alcanzó el máximo de intentos de reconexión (${this.maxReconnectAttempts})`);
      this.logger.error('🚨 Deteniendo intentos de reconexión automática');
    }
  }

  /**
   * @method publishStatus
   * @description Publica el estado del backend en MQTT
   * @param {string} status - Estado a publicar ('online' | 'offline')
   * @private
   */
  private publishStatus(status: 'online' | 'offline'): void {
    if (this.client && this.isConnected) {
      const statusTopic = 'acuaponia/status/backend';
      const statusMessage = {
        status,
        timestamp: new Date().toISOString(),
        clientId: this.client.options.clientId,
        version: '3.0.1'
      };

      this.client.publish(statusTopic, JSON.stringify(statusMessage), { 
        qos: 1, 
        retain: true 
      }, (err) => {
        if (err) {
          this.logger.error(`❌ Error publicando estado: ${err.message}`);
        } else {
          this.logger.log(`📢 Estado publicado: ${status}`);
        }
      });
    }
  }

  /**
   * @method disconnectMqtt
   * @description Desconecta limpiamente del broker MQTT
   * @private
   */
  private disconnectMqtt(): void {
    if (this.client) {
      this.logger.log('🔄 Cerrando conexión MQTT...');
      
      this.publishStatus('offline');
      
      setTimeout(() => {
        this.client.end(true);
        this.isConnected = false;
        this.logger.log('✅ Conexión MQTT cerrada correctamente');
      }, 500);
    }
  }

  /**
   * @method getConnectionStatus
   * @description Obtiene el estado actual de la conexión MQTT
   * @returns {Object} Información del estado de conexión
   * @public
   */
  public getConnectionStatus() {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      clientId: this.client?.options?.clientId || 'N/A',
      brokerUrl: this.configService.get<string>('MQTT_BROKER_URL')
    };
  }

  /**
   * @method publishMessage
   * @description Publica un mensaje en un topic específico
   * @param {string} topic - Topic donde publicar
   * @param {string} message - Mensaje a publicar
   * @param {Object} [options] - Opciones de publicación
   * @returns {Promise<void>}
   * @public
   */
  public async publishMessage(topic: string, message: string, options: { qos?: 0 | 1 | 2; retain?: boolean } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('Cliente MQTT no está conectado'));
        return;
      }

      this.client.publish(topic, message, {
        qos: options.qos || 0,
        retain: options.retain || false
      }, (err) => {
        if (err) {
          this.logger.error(`❌ Error publicando en topic "${topic}": ${err.message}`);
          reject(err);
        } else {
          this.logger.log(`📤 Mensaje publicado en topic "${topic}"`);
          resolve();
        }
      });
    });
  }
}