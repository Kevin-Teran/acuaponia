import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { connect, MqttClient, IClientOptions } from 'mqtt';
import { DataService } from '../data/data.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MqttService implements OnModuleInit {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient;

  constructor(
    private readonly dataService: DataService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService, // Inyectamos ConfigService
  ) {}

  onModuleInit() {
    // Leemos las variables directamente del .env a través de ConfigService
    const connectUrl = this.configService.get<string>('MQTT_BROKER_URL');
    const username = this.configService.get<string>('MQTT_USERNAME');
    const password = this.configService.get<string>('MQTT_PASSWORD');
    const clientId = this.configService.get<string>('MQTT_CLIENT_ID', `nest-backend-${Math.random().toString(16).slice(2, 8)}`);

    if (!connectUrl) {
      this.logger.error('La variable de entorno MQTT_BROKER_URL no está definida. El servicio MQTT no se iniciará.');
      return;
    }

    const options: IClientOptions = {
      clientId,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
      username,
      password,
    };

    this.client = connect(connectUrl, options);

    this.client.on('connect', () => {
      this.logger.log('🔌 Conectado exitosamente al Broker MQTT en la nube (HiveMQ)');
      // El '+' es un comodín para cualquier hardwareId.
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
      // Este log ahora mostrará errores más específicos de la conexión a HiveMQ
      this.logger.error('Error de conexión MQTT:', err.message);
    });
  }

  private async handleSensorMessage(topic: string, message: string) {
    this.logger.log(`Mensaje recibido en [${topic}]: ${message}`);
    try {
      const hardwareId = topic.split('/')[3];
      if (!hardwareId) {
        this.logger.warn(`No se pudo extraer hardwareId del tópico: ${topic}`);
        return;
      }

      const sensor = await this.prisma.sensor.findUnique({
        where: { hardwareId },
      });

      if (!sensor) {
        this.logger.warn(`Sensor con hardwareId '${hardwareId}' no encontrado en la base de datos.`);
        return;
      }

      const data = JSON.parse(message);
      const value = parseFloat(data.value);

      if (isNaN(value)) {
        this.logger.warn(`Valor inválido recibido para ${hardwareId}: ${data.value}`);
        return;
      }

      await this.dataService.createEntryFromMqtt({
        sensorId: sensor.id,
        tankId: sensor.tankId,
        type: sensor.type,
        value,
      });

    } catch (error) {
      this.logger.error('Error procesando mensaje MQTT:', error);
    }
  }
}