/**
 * @file mqtt.service.ts
 * @route /backend/src/mqtt
 * @description Servicio backend para gestionar la conexión y comunicación con el broker MQTT.
 * Escucha los topics de los sensores y delega el procesamiento de datos al DataService.
 * @author Kevin Mariano 
 * @version 1.0.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger, Inject, forwardRef } from '@nestjs/common';
import { connect, MqttClient, IClientOptions } from 'mqtt';
import { DataService } from '../data/data.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient;
  private readonly topicPattern = '+'; 

  constructor(
    @Inject(forwardRef(() => DataService))
    private readonly dataService: DataService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.initializeMqttConnection();
  }

  onModuleDestroy(): void {
    this.disconnectMqtt();
  }

  private async initializeMqttConnection(): Promise<void> {
    const connectUrl = this.configService.get<string>('MQTT_BROKER_URL');
    const username = this.configService.get<string>('MQTT_USERNAME');
    const password = this.configService.get<string>('MQTT_PASSWORD');
    const clientId = `nest-acuaponia-backend-${Math.random().toString(16).slice(2, 8)}`;

    if (!connectUrl) {
      this.logger.error('❌ MQTT_BROKER_URL no está definida. El servicio MQTT no se iniciará.');
      return;
    }

    this.logger.log(`🔄 [MQTT] Conectando a: ${connectUrl}`);
    const options: IClientOptions = { clientId, clean: true, connectTimeout: 4000, reconnectPeriod: 5000, username, password };

    try {
      this.client = connect(connectUrl, options);
      this.setupEventHandlers();
    } catch (error) {
      this.logger.error(`❌ Error al crear cliente MQTT: ${error.message}`);
    }
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      this.logger.log('✅ [MQTT] Conectado exitosamente al broker');
      this.subscribeToTopics();
    });

    this.client.on('message', (topic, payload) => {
      this.logger.log(`📨 [MQTT] Mensaje RECIBIDO | Topic: [${topic}] | Payload: "${payload.toString()}"`);
      this.handleSensorMessage(topic, payload.toString());
    });

    this.client.on('error', (err) => this.logger.error(`❌ [MQTT] Error de conexión: ${err.message}`));
    this.client.on('close', () => this.logger.warn('🔌 [MQTT] Desconectado del broker'));
    this.client.on('reconnect', () => this.logger.log('🔄 [MQTT] Reconectando...'));
  }

  private subscribeToTopics(): void {
    this.client.subscribe(this.topicPattern, { qos: 1 }, (err) => {
      if (!err) {
        this.logger.log(`📡 [MQTT] Suscripción exitosa al patrón de topics: "${this.topicPattern}"`);
      } else {
        this.logger.error(`❌ [MQTT] Falló la suscripción al patrón "${this.topicPattern}":`, err);
      }
    });
  }

  /**
   * Procesa el mensaje MQTT, lo valida y lo envía al DataService para ser guardado.
   */
  private async handleSensorMessage(topic: string, message: string): Promise<void> {
    try {
      const hardwareId = topic.trim();
      const value = parseFloat(message.trim());

      if (!hardwareId || isNaN(value)) {
        this.logger.warn(`⚠️ [MQTT] Mensaje inválido o malformado. Descartado.`);
        return;
      }

      this.logger.log(`🔧 [MQTT] Procesando | hardwareId: ${hardwareId}, valor: ${value}`);
      
      await this.dataService.createFromMqtt(hardwareId, { value });
      this.logger.log(`✅ [MQTT] Mensaje para ${hardwareId} enviado a DataService exitosamente.`);

    } catch (error) {
      this.logger.error(`💥 [MQTT] Error al procesar mensaje para "${topic}": ${error.message}`);
    }
  }

  public publishMessage(topic: string, message: string): void {
    if (this.client?.connected) {
      this.client.publish(topic, message, { qos: 1 }, (err) => {
        if (err) this.logger.error(`❌ [MQTT] Error al publicar en topic "${topic}": ${err.message}`);
      });
    } else {
      this.logger.error('❌ [MQTT] No se puede publicar, cliente no conectado.');
    }
  }

  private disconnectMqtt(): void {
    if (this.client) {
      this.client.end(true, () => this.logger.log('✅ [MQTT] Conexión cerrada.'));
    }
  }
}