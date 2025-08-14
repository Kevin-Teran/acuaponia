import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import Swal from 'sweetalert2';

/**
 * @fileoverview Servicio Singleton para gestionar la conexión con el broker MQTT.
 * Este enfoque asegura que solo exista una instancia de la conexión MQTT durante
 * toda la sesión del usuario, evitando reconexiones innecesarias.
 */
class MqttService {
  /**
   * @private
   * @description Almacena la instancia del cliente MQTT. Es `null` si no está conectado.
   */
  private client: MqttClient | null = null;
  
  /**
   * @private
   * @description Una promesa que se usa para evitar múltiples intentos de conexión simultáneos.
   * Si se llama a `connect()` mientras ya hay una conexión en curso, se devuelve esta promesa.
   */
  private connectionPromise: Promise<void> | null = null;

  /**
   * @private
   * @readonly
   * @description Lee las credenciales y la URL desde las variables de entorno (.env).
   * Es crucial que el archivo `.env` esté en la carpeta raíz del proyecto y que el servidor de Vite se reinicie
   * después de cualquier cambio en este archivo.
   */
  private readonly config = {
    url: import.meta.env.VITE_MQTT_URL,
    username: import.meta.env.VITE_MQTT_USERNAME,
    password: import.meta.env.VITE_MQTT_PASSWORD,
  };
  
  /**
   * @public
   * @method connect
   * @description Inicia y gestiona la conexión con el broker MQTT. Es un método seguro
   * que evita crear conexiones duplicadas.
   * @returns {Promise<void>} Una promesa que se resuelve si la conexión es exitosa o se rechaza si falla.
   */
  public connect(): Promise<void> {
    // Si ya estamos conectados, no hacemos nada.
    if (this.client && this.client.connected) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (!this.config.url || !this.config.username || !this.config.password) {
      console.error('❌ Error Crítico: Faltan variables de entorno para MQTT en el archivo .env (VITE_MQTT_URL, VITE_MQTT_USERNAME, VITE_MQTT_PASSWORD)');
      Swal.fire({
        icon: 'error',
        title: 'Error de Configuración',
        text: 'No se encontraron las credenciales para conectar al broker MQTT. Revisa el archivo .env y reinicia el servidor.'
      });
      return Promise.reject(new Error('Variables de entorno MQTT no configuradas.'));
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const options: IClientOptions = {
        clientId: `sena-acuaponia-frontend-${Math.random().toString(16).slice(2, 8)}`,
        username: this.config.username,
        password: this.config.password,
        connectTimeout: 10000, 
        reconnectPeriod: 2000, 
        clean: true,
      };

      this.client = mqtt.connect(this.config.url, options);


      this.client.on('connect', () => {
        this.connectionPromise = null; 
        resolve();
      });

      this.client.on('error', (err: Error & { code?: number }) => {
        console.error(`❌ Error de conexión MQTT: ${err.message}`);
        if (!this.client?.connected) {
            this.connectionPromise = null;
            reject(err);
        }
      });
      
      this.client.on('reconnect', () => {
        console.log('🔄 Reintentando conexión con el broker MQTT...');
      });

      this.client.on('close', () => {
          console.warn('🔌 Conexión MQTT cerrada.');
      });
    });

    return this.connectionPromise;
  }

  /**
   * @public
   * @method publish
   * @description Publica un mensaje en un tópico MQTT. Si no está conectado, intentará conectarse primero.
   * @param {string} topic - El tópico al que se publicará el mensaje.
   * @param {string} message - El mensaje a publicar.
   * @returns {Promise<void>}
   */
  public async publish(topic: string, message: string): Promise<void> {
    try {
      if (!this.client || !this.client.connected) {
        await this.connect();
      }

      return new Promise((resolve, reject) => {
        this.client!.publish(topic, message, (err) => {
          if (err) {
            console.error(`Error al publicar en [${topic}]:`, err);
            reject(err);
          } else {
            console.log(`📦 Mensaje publicado en [${topic}]: ${message}`);
            resolve();
          }
        });
      });
    } catch (error) {
        Swal.fire({
            icon: 'error',
            title: 'Fallo al Publicar',
            text: 'No se pudo conectar al broker MQTT para enviar el dato.'
        });
        throw error;
    }
  }

  /**
   * @public
   * @method disconnect
   * @description Cierra la conexión MQTT de forma segura.
   */
  public disconnect(): void {
    if (this.client) {
      this.client.end(true); // El 'true' fuerza el cierre.
      this.client = null;
      console.log('🔌 Desconectado del broker MQTT.');
    }
  }
}

export const mqttService = new MqttService();