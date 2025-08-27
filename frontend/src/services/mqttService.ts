/**
 * @file mqttService.ts
 * @description Servicio Singleton para gestionar la conexión y comunicación con el broker MQTT.
 * @author Kevin Mariano (Refactorizado por Gemini)
 * @version 2.1.0
 * @since 1.0.0
 */
import mqtt, { MqttClient, IClientOptions } from 'mqtt';

class MqttService {
  private client: MqttClient | null = null;
  private connectionPromise: Promise<void> | null = null;

  private connectInternal(): Promise<void> {
    if (this.client?.connected) {
      return Promise.resolve();
    }
    
    // Si ya estamos intentando conectar, devolvemos la promesa existente
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const brokerUrl = process.env.NEXT_PUBLIC_MQTT_URL;
      const username = process.env.NEXT_PUBLIC_MQTT_USERNAME;
      const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD;

      if (!brokerUrl) {
        console.error("Error: NEXT_PUBLIC_MQTT_URL no está definida.");
        return reject(new Error("MQTT Broker URL no definida."));
      }

      const options: IClientOptions = {
        username,
        password,
        clientId: `sena_acuaponia_frontend_${Math.random().toString(16).substring(2, 8)}`,
        reconnectPeriod: 5000,
        // --- ESTA ES LA CORRECCIÓN CLAVE ---
        // Mantiene la conexión viva enviando pings cada 30 segundos.
        keepalive: 30,
        // Tiempo máximo de espera para conectar.
        connectTimeout: 10000, 
      };

      this.client = mqtt.connect(brokerUrl, options);

      this.client.on('connect', () => {
        console.log('✅ Conectado exitosamente al broker MQTT.');
        this.connectionPromise = null; // Limpiamos la promesa al conectar
        resolve();
      });

      this.client.on('error', (err) => {
        console.error('❌ Error de conexión MQTT:', err);
        this.client?.end();
        this.connectionPromise = null;
        reject(err);
      });

      this.client.on('close', () => {
        console.log('🔌 Desconectado del broker MQTT.');
      });
    });

    return this.connectionPromise;
  }

  // --- MÉTODOS PÚBLICOS MEJORADOS ---

  public async connect(): Promise<void> {
    try {
      await this.connectInternal();
    } catch (error) {
      console.error("Fallo final en la conexión a MQTT", error);
    }
  }

  public async publish(topic: string, message: string): Promise<void> {
    try {
      // Intentamos conectar (no hará nada si ya está conectado)
      await this.connectInternal();
      if (this.client && this.client.connected) {
        this.client.publish(topic, message);
      } else {
        throw new Error("No se pudo establecer la conexión para publicar.");
      }
    } catch (error) {
      console.error(`No se puede publicar en "${topic}".`, error);
    }
  }

  public disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }
}

export const mqttService = new MqttService();