/**
 * @file mqttService.ts
 * @description Servicio optimizado para gestionar la conexión y comunicación MQTT en el frontend.
 * Implementa el nuevo formato de topic simplificado y manejo robusto de conexiones.
 * @author Kevin Mariano (Refactorizado y optimizado por Gemini)
 * @version 3.0.0
 * @since 1.0.0
 */
import mqtt, { MqttClient, IClientOptions } from 'mqtt';

/**
 * @interface MqttConnectionStatus
 * @description Estado de la conexión MQTT
 */
interface MqttConnectionStatus {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  lastConnected: Date | null;
}

/**
 * @interface MqttMessage
 * @description Estructura del mensaje MQTT a enviar
 */
interface MqttMessage {
  value: number;
  timestamp: string;
  unit?: string;
  sensor?: {
    name: string;
    type: string;
  };
}

/**
 * @class MqttService
 * @description Servicio singleton para manejo de MQTT en el cliente
 * Gestiona conexiones, publicaciones y manejo de errores de forma robusta
 */
class MqttService {
  private client: MqttClient | null = null;
  private connectionPromise: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private status: MqttConnectionStatus = {
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0,
    lastConnected: null
  };

  // Configuración
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectInterval = 5000; // 5 segundos
  private readonly publishTimeout = 10000; // 10 segundos
  private readonly keepalive = 30;
  private readonly connectTimeout = 10000;

  // Callbacks para eventos
  private statusListeners: Array<(status: MqttConnectionStatus) => void> = [];
  private messageListeners: Array<(topic: string, message: string) => void> = [];

  /**
   * @method getInstance
   * @description Obtiene la instancia singleton del servicio
   * @returns {MqttService} Instancia única del servicio
   * @static
   */
  static getInstance(): MqttService {
    if (!MqttService.instance) {
      MqttService.instance = new MqttService();
    }
    return MqttService.instance;
  }
  private static instance: MqttService;

  private constructor() {
    // Constructor privado para patrón singleton
  }

  /**
   * @method connect
   * @description Establece conexión con el broker MQTT
   * @returns {Promise<void>} Promesa que resuelve cuando se conecta
   * @throws {Error} Si no se puede establecer la conexión
   */
  public async connect(): Promise<void> {
    // Si ya estamos conectados, devolver inmediatamente
    if (this.client?.connected) {
      return Promise.resolve();
    }
    
    // Si ya hay un intento de conexión en curso, devolver esa promesa
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this.connectInternal();
    
    try {
      await this.connectionPromise;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * @method connectInternal
   * @description Lógica interna de conexión
   * @returns {Promise<void>}
   * @private
   */
  private connectInternal(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const brokerUrl = process.env.NEXT_PUBLIC_MQTT_URL;
        const username = process.env.NEXT_PUBLIC_MQTT_USERNAME;
        const password = process.env.NEXT_PUBLIC_MQTT_PASSWORD;

        if (!brokerUrl) {
          const error = 'NEXT_PUBLIC_MQTT_URL no está definida en las variables de entorno';
          console.error(`❌ [MQTT] ${error}`);
          this.updateStatus({ error });
          return reject(new Error(error));
        }

        console.log(`🔄 [MQTT] Conectando a: ${brokerUrl}`);
        this.updateStatus({ connecting: true, error: null });

        const options: IClientOptions = {
          clientId: `sena_acuaponia_client_${Math.random().toString(16).substring(2, 8)}`,
          clean: true,
          connectTimeout: this.connectTimeout,
          keepalive: this.keepalive,
          reconnectPeriod: 0, // Deshabilitamos reconexión automática para manejarla manualmente
          username,
          password,
          will: {
            topic: 'acuaponia/clients/status',
            payload: JSON.stringify({
              clientId: `sena_acuaponia_client_${Math.random().toString(16).substring(2, 8)}`,
              status: 'offline',
              timestamp: new Date().toISOString()
            }),
            qos: 1,
            retain: false
          }
        };

        this.client = mqtt.connect(brokerUrl, options);
        this.setupEventHandlers(resolve, reject);

      } catch (error) {
        console.error(`❌ [MQTT] Error creando cliente:`, error);
        this.updateStatus({ 
          connecting: false, 
          error: error instanceof Error ? error.message : 'Error desconocido' 
        });
        reject(error);
      }
    });
  }

  /**
   * @method setupEventHandlers
   * @description Configura los manejadores de eventos del cliente MQTT
   * @param {Function} resolve - Función de resolución de la promesa
   * @param {Function} reject - Función de rechazo de la promesa
   * @private
   */
  private setupEventHandlers(resolve: Function, reject: Function): void {
    if (!this.client) return;

    // Evento: Conexión exitosa
    this.client.on('connect', () => {
      console.log('✅ [MQTT] Conectado exitosamente al broker');
      this.updateStatus({
        connected: true,
        connecting: false,
        error: null,
        reconnectAttempts: 0,
        lastConnected: new Date()
      });
      
      // Publicar estado online
      this.publishStatus('online');
      resolve();
    });

    // Evento: Error de conexión
    this.client.on('error', (err) => {
      console.error(`❌ [MQTT] Error de conexión:`, err);
      const errorMessage = err.message || 'Error de conexión desconocido';
      this.updateStatus({ 
        connected: false, 
        connecting: false, 
        error: errorMessage 
      });
      
      // Solo rechazar si es el primer intento
      if (this.status.reconnectAttempts === 0) {
        reject(new Error(errorMessage));
      }
    });

    // Evento: Desconexión
    this.client.on('close', () => {
      console.log('🔌 [MQTT] Desconectado del broker');
      this.updateStatus({ 
        connected: false, 
        connecting: false 
      });
      
      // Intentar reconectar si no fue desconexión intencional
      if (this.status.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    });

    // Evento: Mensaje recibido
    this.client.on('message', (topic, payload) => {
      const message = payload.toString();
      console.log(`📨 [MQTT] Mensaje recibido en topic "${topic}":`, message);
      
      // Notificar a los listeners
      this.messageListeners.forEach(listener => {
        try {
          listener(topic, message);
        } catch (error) {
          console.error(`❌ [MQTT] Error en listener de mensaje:`, error);
        }
      });
    });

    // Evento: Reconexión
    this.client.on('reconnect', () => {
      console.log(`🔄 [MQTT] Intentando reconectar... (Intento ${this.status.reconnectAttempts + 1})`);
      this.updateStatus({ 
        connecting: true,
        reconnectAttempts: this.status.reconnectAttempts + 1
      });
    });
  }

  /**
   * @method scheduleReconnect
   * @description Programa un intento de reconexión
   * @private
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.status.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ [MQTT] Se alcanzó el máximo de intentos de reconexión (${this.maxReconnectAttempts})`);
      this.updateStatus({ 
        error: `Falló la conexión después de ${this.maxReconnectAttempts} intentos` 
      });
      return;
    }

    console.log(`⏰ [MQTT] Reconexión programada en ${this.reconnectInterval}ms`);
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error(`❌ [MQTT] Error en reconexión:`, error);
      }
    }, this.reconnectInterval);
  }

  /**
   * @method publish
   * @description Publica un mensaje en un topic específico con el nuevo formato
   * @param {string} hardwareId - ID del hardware del sensor (será el topic)
   * @param {string} message - Mensaje a publicar (JSON string)
   * @param {Object} [options] - Opciones de publicación
   * @returns {Promise<void>} Promesa que resuelve cuando se publica
   * @throws {Error} Si no se puede publicar el mensaje
   */
  public async publish(hardwareId: string, message: string, options: { qos?: 0 | 1 | 2; retain?: boolean } = {}): Promise<void> {
    // Verificar que el hardwareId sea válido
    if (!hardwareId || typeof hardwareId !== 'string' || hardwareId.trim() === '') {
      throw new Error('El hardwareId es requerido y debe ser una cadena válida');
    }

    // Verificar conexión
    if (!this.client || !this.client.connected) {
      console.warn(`⚠️ [MQTT] Cliente no conectado, intentando conectar...`);
      await this.connect();
    }

    if (!this.client?.connected) {
      throw new Error('No se pudo establecer conexión MQTT para publicar');
    }

    return new Promise((resolve, reject) => {
      const topic = hardwareId.trim(); // El topic es directamente el hardwareId
      const publishOptions = {
        qos: (options.qos || 1) as 0 | 1 | 2,
        retain: options.retain || false
      };

      console.log(`📤 [MQTT] Publicando en topic "${topic}":`, message);

      // Timeout para la publicación
      const timeoutId = setTimeout(() => {
        reject(new Error(`Timeout al publicar en topic "${topic}"`));
      }, this.publishTimeout);

      this.client!.publish(topic, message, publishOptions, (err) => {
        clearTimeout(timeoutId);
        
        if (err) {
          console.error(`❌ [MQTT] Error publicando en topic "${topic}":`, err);
          reject(new Error(`Error publicando: ${err.message}`));
        } else {
          console.log(`✅ [MQTT] Mensaje publicado exitosamente en topic "${topic}"`);
          resolve();
        }
      });
    });
  }

  /**
   * @method publishSensorData
   * @description Publica datos de sensor con formato estándar
   * @param {string} hardwareId - ID del hardware del sensor
   * @param {number} value - Valor del sensor
   * @param {Object} [options] - Opciones adicionales
   * @returns {Promise<void>}
   */
  public async publishSensorData(
    hardwareId: string, 
    value: number, 
    options: {
      unit?: string;
      sensorName?: string;
      sensorType?: string;
      timestamp?: Date;
    } = {}
  ): Promise<void> {
    const message: MqttMessage = {
      value,
      timestamp: (options.timestamp || new Date()).toISOString(),
      ...(options.unit && { unit: options.unit }),
      ...(options.sensorName && options.sensorType && {
        sensor: {
          name: options.sensorName,
          type: options.sensorType
        }
      })
    };

    await this.publish(hardwareId, JSON.stringify(message));
  }

  /**
   * @method subscribe
   * @description Se suscribe a un topic
   * @param {string} topic - Topic al cual suscribirse
   * @param {Object} [options] - Opciones de suscripción
   * @returns {Promise<void>}
   */
  public async subscribe(topic: string, options: { qos?: 0 | 1 | 2 } = {}): Promise<void> {
    if (!this.client?.connected) {
      await this.connect();
    }

    if (!this.client?.connected) {
      throw new Error('No se pudo establecer conexión MQTT para suscribirse');
    }

    return new Promise((resolve, reject) => {
      this.client!.subscribe(topic, { qos: options.qos || 1 }, (err, granted) => {
        if (err) {
          console.error(`❌ [MQTT] Error suscribiéndose al topic "${topic}":`, err);
          reject(err);
        } else {
          console.log(`📡 [MQTT] Suscrito exitosamente al topic "${topic}"`, granted);
          resolve();
        }
      });
    });
  }

  /**
   * @method unsubscribe
   * @description Se desuscribe de un topic
   * @param {string} topic - Topic del cual desuscribirse
   * @returns {Promise<void>}
   */
  public async unsubscribe(topic: string): Promise<void> {
    if (!this.client?.connected) {
      console.warn(`⚠️ [MQTT] Cliente no conectado para desuscribirse de "${topic}"`);
      return;
    }

    return new Promise((resolve, reject) => {
      this.client!.unsubscribe(topic, (err) => {
        if (err) {
          console.error(`❌ [MQTT] Error desuscribiéndose del topic "${topic}":`, err);
          reject(err);
        } else {
          console.log(`📡 [MQTT] Desuscrito exitosamente del topic "${topic}"`);
          resolve();
        }
      });
    });
  }

  /**
   * @method disconnect
   * @description Desconecta del broker MQTT
   */
  public disconnect(): void {
    console.log('🔄 [MQTT] Cerrando conexión...');
    
    // Limpiar timer de reconexión
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Publicar estado offline antes de desconectar
    this.publishStatus('offline').finally(() => {
      if (this.client) {
        this.client.end(true);
        this.client = null;
      }
      
      this.updateStatus({
        connected: false,
        connecting: false,
        reconnectAttempts: 0,
        error: null
      });
      
      console.log('✅ [MQTT] Conexión cerrada correctamente');
    });
  }

  /**
   * @method publishStatus
   * @description Publica el estado del cliente
   * @param {'online' | 'offline'} status - Estado a publicar
   * @returns {Promise<void>}
   * @private
   */
  private async publishStatus(status: 'online' | 'offline'): Promise<void> {
    if (!this.client?.connected && status === 'online') return;

    try {
      const statusMessage = {
        clientId: this.client?.options?.clientId || 'unknown',
        status,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      const statusTopic = 'acuaponia/clients/status';
      
      if (this.client?.connected) {
        await new Promise<void>((resolve, reject) => {
          this.client!.publish(statusTopic, JSON.stringify(statusMessage), { qos: 1, retain: false }, (err) => {
            if (err) {
              console.error(`❌ [MQTT] Error publicando estado:`, err);
              reject(err);
            } else {
              console.log(`📢 [MQTT] Estado publicado: ${status}`);
              resolve();
            }
          });
        });
      }
    } catch (error) {
      console.error(`❌ [MQTT] Error en publishStatus:`, error);
    }
  }

  /**
   * @method updateStatus
   * @description Actualiza el estado interno y notifica a los listeners
   * @param {Partial<MqttConnectionStatus>} updates - Actualizaciones del estado
   * @private
   */
  private updateStatus(updates: Partial<MqttConnectionStatus>): void {
    this.status = { ...this.status, ...updates };
    
    // Notificar a todos los listeners
    this.statusListeners.forEach(listener => {
      try {
        listener(this.status);
      } catch (error) {
        console.error(`❌ [MQTT] Error en listener de estado:`, error);
      }
    });
  }

  /**
   * @method getStatus
   * @description Obtiene el estado actual de la conexión
   * @returns {MqttConnectionStatus} Estado actual
   */
  public getStatus(): MqttConnectionStatus {
    return { ...this.status };
  }

  /**
   * @method isConnected
   * @description Verifica si está conectado
   * @returns {boolean} True si está conectado
   */
  public isConnected(): boolean {
    return this.client?.connected === true;
  }

  /**
   * @method onStatusChange
   * @description Registra un listener para cambios de estado
   * @param {Function} callback - Función callback
   * @returns {Function} Función para cancelar la suscripción
   */
  public onStatusChange(callback: (status: MqttConnectionStatus) => void): () => void {
    this.statusListeners.push(callback);
    
    // Devolver función para cancelar suscripción
    return () => {
      const index = this.statusListeners.indexOf(callback);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  /**
   * @method onMessage
   * @description Registra un listener para mensajes MQTT
   * @param {Function} callback - Función callback
   * @returns {Function} Función para cancelar la suscripción
   */
  public onMessage(callback: (topic: string, message: string) => void): () => void {
    this.messageListeners.push(callback);
    
    // Devolver función para cancelar suscripción
    return () => {
      const index = this.messageListeners.indexOf(callback);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  /**
   * @method getConnectionInfo
   * @description Obtiene información detallada de la conexión
   * @returns {Object} Información de conexión
   */
  public getConnectionInfo() {
    return {
      status: this.status,
      clientId: this.client?.options?.clientId || null,
      brokerUrl: process.env.NEXT_PUBLIC_MQTT_URL || null,
      connected: this.isConnected(),
      hasClient: !!this.client
    };
  }

  /**
   * @method resetConnection
   * @description Reinicia la conexión MQTT
   * @returns {Promise<void>}
   */
  public async resetConnection(): Promise<void> {
    console.log('🔄 [MQTT] Reiniciando conexión...');
    
    this.disconnect();
    
    // Esperar un momento antes de reconectar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Reiniciar estado
    this.status.reconnectAttempts = 0;
    this.status.error = null;
    
    await this.connect();
  }
}

// Exportar instancia singleton
export const mqttService = MqttService.getInstance();