import mqtt, { MqttClient, IClientOptions } from 'mqtt';

class MqttService {
  private client: MqttClient | null = null;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

  connect(): Promise<void> {
    if (this.client && (this.client.connected || this.client.reconnecting)) {
      return Promise.resolve();
    }

    const brokerUrl = process.env.NEXT_PUBLIC_MQTT_URL; 
    const username = process.env.NEXT_PUBLIC_MQTT_USERNAME; 
    const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD;

    if (!brokerUrl) {
      console.error("Error: La URL del broker MQTT no está definida en las variables de entorno (NEXT_PUBLIC_MQTT_URL).");
      this.connectionStatus = 'error';
      return Promise.reject(new Error("MQTT Broker URL no definida."));
    }

    const options: IClientOptions = {
      username,
      password,
      clientId: `sena_acuaponia_frontend_${Math.random().toString(16).substring(2, 8)}`,
      reconnectPeriod: 5000,
    };

    this.connectionStatus = 'connecting';
    this.client = mqtt.connect(brokerUrl, options);

    return new Promise((resolve, reject) => {
      this.client?.on('connect', () => {
        console.log('✅ Conectado exitosamente al broker MQTT.');
        this.connectionStatus = 'connected';
        resolve();
      });

      this.client?.on('error', (err) => {
        console.error('❌ Error de conexión MQTT:', err);
        this.connectionStatus = 'error';
        this.client?.end();
        reject(err);
      });

      this.client?.on('close', () => {
        if (this.connectionStatus !== 'error') {
            this.connectionStatus = 'disconnected';
            console.log('🔌 Desconectado del broker MQTT.');
        }
      });
    });
  }

  publish(topic: string, message: string): void {
    if (this.client && this.client.connected) {
      this.client.publish(topic, message);
    } else {
      console.error('No se puede publicar. El cliente MQTT no está conectado.');
    }
  }

  subscribe(topic: string, onMessageCallback: (topic: string, message: string) => void): void {
    if (this.client && this.client.connected) {
        this.client.subscribe(topic, (err) => {
            if (!err) {
                this.client?.on('message', onMessageCallback);
            } else {
                console.error(`Error al suscribirse al tópico ${topic}:`, err);
            }
        });
    } else {
        console.error('No se puede suscribir. El cliente MQTT no está conectado.');
    }
  }

  disconnect(): void {
    if (this.client) {
      this.client.end();
      this.client = null;
    }
  }
}

export const mqttService = new MqttService();