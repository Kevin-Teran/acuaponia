import mqtt, { MqttClient } from 'mqtt';
import { logger } from '../utils/logger';
import { socketService } from './socketService';
import { sensorDataService } from './sensorDataService';
import { alertService } from './alertService';

class MQTTService {
  private client: MqttClient | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private isConnected = false;

  // Topics MQTT
  private readonly topics = {
    sensorData: 'sena/acuaponia/sensors/+/data',
    sensorStatus: 'sena/acuaponia/sensors/+/status',
    systemCommands: 'sena/acuaponia/system/commands',
    alerts: 'sena/acuaponia/alerts',
  };

  async initialize(): Promise<void> {
    try {
      const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
      const options = {
        clientId: process.env.MQTT_CLIENT_ID || 'sena_acuaponia_backend',
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        clean: true,
        connectTimeout: 30000,
        reconnectPeriod: 5000,
        keepalive: 60,
      };

      logger.info(`🔌 Conectando a broker MQTT: ${brokerUrl}`);
      
      this.client = mqtt.connect(brokerUrl, options);

      this.client.on('connect', () => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
        logger.info('✅ Conectado al broker MQTT exitosamente');
        this.subscribeToTopics();
      });

      this.client.on('error', (error) => {
        logger.error('❌ Error MQTT:', error);
        this.isConnected = false;
      });

      this.client.on('offline', () => {
        logger.warn('⚠️ Cliente MQTT desconectado');
        this.isConnected = false;
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        logger.info(`🔄 Reintentando conexión MQTT... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          logger.error('❌ Máximo número de reintentos MQTT alcanzado');
          this.client?.end();
        }
      });

      this.client.on('message', this.handleMessage.bind(this));

    } catch (error) {
      logger.error('❌ Error inicializando cliente MQTT:', error);
      throw error;
    }
  }

  private subscribeToTopics(): void {
    if (!this.client) return;

    Object.values(this.topics).forEach(topic => {
      this.client!.subscribe(topic, { qos: 1 }, (error) => {
        if (error) {
          logger.error(`❌ Error suscribiéndose al topic ${topic}:`, error);
        } else {
          logger.info(`✅ Suscrito al topic: ${topic}`);
        }
      });
    });
  }

  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      const messageStr = message.toString();
      logger.debug(`📨 Mensaje MQTT recibido en ${topic}: ${messageStr}`);

      // Parsear mensaje JSON
      let data;
      try {
        data = JSON.parse(messageStr);
      } catch (parseError) {
        logger.error('❌ Error parseando mensaje MQTT:', parseError);
        return;
      }

      // Procesar según el topic
      if (topic.includes('/sensors/') && topic.endsWith('/data')) {
        await this.handleSensorData(topic, data);
      } else if (topic.includes('/sensors/') && topic.endsWith('/status')) {
        await this.handleSensorStatus(topic, data);
      } else if (topic.includes('/alerts')) {
        await this.handleAlert(data);
      }

    } catch (error) {
      logger.error('❌ Error procesando mensaje MQTT:', error);
    }
  }

  private async handleSensorData(topic: string, data: any): Promise<void> {
    try {
      // Extraer ID del sensor del topic
      const sensorId = this.extractSensorIdFromTopic(topic);
      
      if (!sensorId) {
        logger.error('❌ No se pudo extraer ID del sensor del topic:', topic);
        return;
      }

      // Validar estructura de datos
      if (!this.isValidSensorData(data)) {
        logger.error('❌ Datos de sensor inválidos:', data);
        return;
      }

      // Guardar datos en la base de datos
      const sensorData = await sensorDataService.createSensorData({
        sensorId,
        temperature: data.temperature,
        ph: data.ph,
        oxygen: data.oxygen,
        timestamp: new Date(data.timestamp || Date.now()),
      });

      // Emitir datos en tiempo real via Socket.IO
      socketService.emitSensorData(sensorData);

      // Verificar alertas
      await alertService.checkThresholds(sensorId, data);

      logger.debug(`✅ Datos de sensor procesados: ${sensorId}`);

    } catch (error) {
      logger.error('❌ Error procesando datos de sensor:', error);
    }
  }

  private async handleSensorStatus(topic: string, data: any): Promise<void> {
    try {
      const sensorId = this.extractSensorIdFromTopic(topic);
      
      if (!sensorId) {
        logger.error('❌ No se pudo extraer ID del sensor del topic:', topic);
        return;
      }

      // Actualizar estado del sensor
      // await sensorService.updateSensorStatus(sensorId, data);

      // Emitir actualización de estado
      socketService.emitSensorStatus(sensorId, data);

      logger.debug(`✅ Estado de sensor actualizado: ${sensorId}`);

    } catch (error) {
      logger.error('❌ Error procesando estado de sensor:', error);
    }
  }

  private async handleAlert(data: any): Promise<void> {
    try {
      // Procesar alerta
      const alert = await alertService.createAlert(data);

      // Emitir alerta via Socket.IO
      socketService.emitAlert(alert);

      logger.info(`🚨 Alerta procesada: ${alert.type}`);

    } catch (error) {
      logger.error('❌ Error procesando alerta:', error);
    }
  }

  private extractSensorIdFromTopic(topic: string): string | null {
    const match = topic.match(/\/sensors\/([^\/]+)\//);
    return match ? match[1] : null;
  }

  private isValidSensorData(data: any): boolean {
    return (
      typeof data === 'object' &&
      data !== null &&
      (typeof data.temperature === 'number' || data.temperature === null) &&
      (typeof data.ph === 'number' || data.ph === null) &&
      (typeof data.oxygen === 'number' || data.oxygen === null)
    );
  }

  // Métodos públicos para publicar mensajes
  public publishSensorCommand(sensorId: string, command: any): void {
    if (!this.isConnected || !this.client) {
      logger.error('❌ Cliente MQTT no conectado');
      return;
    }

    const topic = `sena/acuaponia/sensors/${sensorId}/commands`;
    const message = JSON.stringify(command);

    this.client.publish(topic, message, { qos: 1 }, (error) => {
      if (error) {
        logger.error(`❌ Error publicando comando a sensor ${sensorId}:`, error);
      } else {
        logger.info(`✅ Comando enviado a sensor ${sensorId}`);
      }
    });
  }

  public publishSystemAlert(alert: any): void {
    if (!this.isConnected || !this.client) {
      logger.error('❌ Cliente MQTT no conectado');
      return;
    }

    const message = JSON.stringify(alert);

    this.client.publish(this.topics.alerts, message, { qos: 1 }, (error) => {
      if (error) {
        logger.error('❌ Error publicando alerta del sistema:', error);
      } else {
        logger.info('✅ Alerta del sistema publicada');
      }
    });
  }

  public isClientConnected(): boolean {
    return this.isConnected;
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      this.client.end();
      this.isConnected = false;
      logger.info('✅ Cliente MQTT desconectado');
    }
  }
}

export const mqttService = new MQTTService();

export async function initializeMQTT(): Promise<void> {
  await mqttService.initialize();
}

export default mqttService;