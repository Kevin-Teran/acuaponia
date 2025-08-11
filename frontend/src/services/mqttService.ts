import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import Swal from 'sweetalert2';

// --- DATOS DE CONEXIÓN CORRECTOS (BASADOS EN TU CAPTURA DE PANTALLA) ---
const MQTT_URL = 'wss://278c5f1010a84ebba686cb4de6a874a9.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_USERNAME = 'sena-tic';
const MQTT_PASSWORD = 'Aa123456';

class MqttService {
  private client: MqttClient | null = null;

  connect(): void {
    if (this.client && this.client.connected) {
      return;
    }

    console.log('Intentando conectar a la URL correcta:', MQTT_URL);

    const options: IClientOptions = {
      clientId: `frontend-final-test-${Math.random().toString(16).slice(2, 8)}`,
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      connectTimeout: 10000,
      reconnectPeriod: 1000,
    };

    this.client = mqtt.connect(MQTT_URL, options);

    this.client.on('connect', () => {
      console.log('✅✅✅ ¡CONEXIÓN MQTT EXITOSA! ✅✅✅');
      Swal.fire({
        icon: 'success',
        title: 'Simulador Conectado',
        text: 'Conexión con el broker MQTT establecida.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
      });
    });

    this.client.on('error', (err) => {
      console.error('Error de conexión MQTT:', err);
    });
  }

  publish(topic: string, message: string): void {
    if (this.client && this.client.connected) {
      this.client.publish(topic, message, (err) => {
        if (err) {
          console.error(`Error al publicar en [${topic}]:`, err);
        } else {
          console.log(`Mensaje publicado en [${topic}]: ${message}`);
        }
      });
    } else {
      console.error('No se puede publicar. Cliente MQTT no conectado.');
      Swal.fire({
          icon: 'error',
          title: 'Error de Conexión',
          text: 'No se puede publicar, el cliente MQTT no está conectado.'
      });
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