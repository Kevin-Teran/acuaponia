/**
 * @file mqtt.service.ts
 * @description Servicio para gestionar la conexión y comunicación con el broker MQTT.
 * @author Kevin Mariano (Reconstruido y optimizado por Gemini)
 * @version 2.2.0
 * @since 1.0.0
 */
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { connect, MqttClient, IClientOptions } from 'mqtt';
import { DataService } from '../data/data.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MqttService implements OnModuleInit {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient;

  constructor(
    private readonly dataService: DataService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const connectUrl = this.configService.get<string>('MQTT_BROKER_URL');
    const username = this.configService.get<string>('MQTT_USERNAME');
    const password = this.configService.get<string>('MQTT_PASSWORD');
    const clientId = `nest-backend-${Math.random().toString(16).slice(2, 8)}`;

    if (!connectUrl) {
      this.logger.error('La variable de entorno MQTT_BROKER_URL no está definida. El servicio MQTT no se iniciará.');
      return;
    }

    const options: IClientOptions = { clientId, clean: true, connectTimeout: 4000, reconnectPeriod: 1000, username, password };
    this.client = connect(connectUrl, options);

    this.client.on('connect', () => {
      this.logger.log('🔌 Conectado exitosamente al Broker MQTT');
      const topic = 'sena/acuaponia/sensors/+/data';
      this.client.subscribe(topic, (err) => {
        if (!err) {
          this.logger.log(`📡 Suscrito al tópico: ${topic}`);
        } else {
          this.logger.error('❌ No se pudo suscribir al tópico MQTT.', err);
        }
      });
    });

    this.client.on('message', (topic, payload) => {
      this.handleSensorMessage(topic, payload.toString());
    });

    this.client.on('error', (err) => {
      this.logger.error('Error de conexión MQTT:', err.message);
    });
  }

  private async handleSensorMessage(topic: string, message: string) {
    this.logger.log(`Mensaje recibido en [${topic}]`);
    try {
      const hardwareId = topic.split('/')[3];
      if (!hardwareId) {
        this.logger.warn(`No se pudo extraer hardwareId del tópico: ${topic}`);
        return;
      }

      const data = JSON.parse(message);
      const value = parseFloat(data.value);

      if (isNaN(value)) {
        this.logger.warn(`Valor inválido recibido para ${hardwareId}: ${data.value}`);
        return;
      }
      
      // --- ESTA ES LA CORRECCIÓN CLAVE ---
      // Se cambió el nombre de la función a 'createFromMqtt' para que coincida con data.service.ts
      await this.dataService.createFromMqtt(hardwareId, { value, timestamp: data.timestamp });

    } catch (error) {
      this.logger.error(`Error procesando mensaje MQTT del topic "${topic}": ${error.message}`);
    }
  }
}