/**
 * @file mqttService.ts
 * @description Servicio optimizado para gestionar la conexión y comunicación MQTT en el frontend.
 * Implementa payload simplificado y manejo eficiente de conexiones.
 * @author Kevin Mariano 
 * @version 4.0.0 
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
  messagesPublished: number;
  messagesReceived: number;
}

/**
 * @interface OptimizedMqttMessage
 * @description Estructura optimizada del mensaje MQTT (solo lo esencial)
 */
interface OptimizedMqttMessage {
  value: number;
  timestamp?: string;
}

/**
 * @interface PublishMetrics
 * @description Métricas de publicación para monitoreo
 */
interface PublishMetrics {
  totalMessages: number;
  successfulMessages: number;
  failedMessages: number;
  averageLatency: number;
  lastPublishTime: Date | null;
}

/**
 * @class MqttService
 * @description Servicio singleton optimizado para manejo de MQTT en el cliente
 * Enfocado en eficiencia de payload y rendimiento
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
    lastConnected: null,
    messagesPublished: 0,
    messagesReceived: 0
  };

  // Métricas de rendimiento
  private publishMetrics: PublishMetrics = {
    totalMessages: 0,
    successfulMessages: 0,
    failedMessages: 0,
    averageLatency: 0,
    lastPublishTime: null
  };

  // Configuración optimizada
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectInterval = 3000; // 3 segundos (reducido)
  private readonly publishTimeout = 5000; // 5 segundos (reducido)
  private readonly keepalive = 60; // Aumentado para eficiencia
  private readonly connectTimeout = 8000; // Reducido

  // Callbacks para eventos
  private statusListeners: Array<(status: MqttConnectionStatus) => void> = [];
  private messageListeners: Array<(topic: string, message: string) => void> = [];
  private metricsListeners: Array<(metrics: PublishMetrics) => void> = [];

  // Cache para optimización
  private topicCache = new Set<string>();
  private publishQueue: Array<{ topic: string; message: string; options: any; resolve: Function; reject: Function }> = [];
  private processingQueue = false;

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
    this.startMetricsReporting();
  }

  /**
   * @method startMetricsReporting
   * @description Inicia el reporte periódico de métricas
   * @private
   */
  private startMetricsReporting(): void {
    setInterval(() => {
      if (this.publishMetrics.totalMessages > 0 && this.metricsListeners.length > 0) {
        this.notifyMetricsListeners();
      }
    }, 30000); // Cada 30 segundos
  }

  /**
   * @method connect
   * @description Establece conexión optimizada con el broker MQTT
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
   * @description Lógica interna de conexión optimizada
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
          clientId: `acuaponia_optimized_${Date.now()}_${Math.random().toString(16).substring(2, 6)}`,
          clean: true,
          connectTimeout: this.connectTimeout,
          keepalive: this.keepalive,
          reconnectPeriod: 0, // Manejo manual de reconexión
          username,
          password,
          // Configuración optimizada
          protocolVersion: 4, // MQTT 3.1.1 para mejor compatibilidad
          reschedulePings: true,
          will: {
            topic: 'acuaponia/clients/disconnect',
            payload: JSON.stringify({
              clientId: `acuaponia_optimized_${Date.now()}`,
              timestamp: new Date().toISOString(),
              reason: 'unexpected_disconnect'
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
   * @description Configura los manejadores de eventos del cliente MQTT con optimizaciones
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
      
      // Procesar cola de mensajes pendientes
      this.processPublishQueue();
      
      // Publicar estado online de forma optimizada
      this.publishConnectionStatus('online');
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
      
      this.publishMetrics.failedMessages++;
      
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
      
      // Intentar reconectar automáticamente
      if (this.status.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        console.error('🚨 [MQTT] Máximo de reconexiones alcanzado');
      }
    });

    // Evento: Mensaje recibido (optimizado para logging)
    this.client.on('message', (topic, payload) => {
      this.status.messagesReceived++;
      const message = payload.toString();
      
      // Log selectivo para evitar spam
      if (this.status.messagesReceived % 50 === 0) {
        console.log(`📨 [MQTT] Mensajes recibidos: ${this.status.messagesReceived}`);
      }
      
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
      console.log(`🔄 [MQTT] Reconectando... (Intento ${this.status.reconnectAttempts + 1})`);
      this.updateStatus({ 
        connecting: true,
        reconnectAttempts: this.status.reconnectAttempts + 1
      });
    });

    // Evento: Desconexión del paquete
    this.client.on('packetsend', (packet) => {
      if (packet.cmd === 'publish') {
        this.status.messagesPublished++;
      }
    });

    // Evento: Ping respuesta (para monitorear latencia)
    this.client.on('pingresp', () => {
      // Cliente está respondiendo correctamente
    });
  }

  /**
   * @method scheduleReconnect
   * @description Programa un intento de reconexión con backoff
   * @private
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.status.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ [MQTT] Máximo de reconexiones alcanzado (${this.maxReconnectAttempts})`);
      this.updateStatus({ 
        error: `Conexión perdida después de ${this.maxReconnectAttempts} intentos` 
      });
      return;
    }

    // Backoff exponencial con jitter
    const baseDelay = this.reconnectInterval;
    const backoffMultiplier = Math.pow(2, this.status.reconnectAttempts);
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay * backoffMultiplier + jitter, 30000); // Máximo 30 segundos

    console.log(`⏰ [MQTT] Reconexión programada en ${Math.round(delay)}ms`);
    
    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error(`❌ [MQTT] Error en reconexión:`, error);
      }
    }, delay);
  }

  /**
   * @method publish
   * @description Publica un mensaje optimizado (solo valor o valor+timestamp)
   * @param {string} hardwareId - ID del hardware del sensor (topic)
   * @param {string} message - Mensaje a publicar (valor simple o JSON mínimo)
   * @param {Object} [options] - Opciones de publicación
   * @returns {Promise<void>} Promesa que resuelve cuando se publica
   * @throws {Error} Si no se puede publicar el mensaje
   */
  public async publish(
    hardwareId: string, 
    message: string, 
    options: { qos?: 0 | 1 | 2; retain?: boolean; priority?: 'high' | 'normal' | 'low' } = {}
  ): Promise<void> {
    // Validación de entrada
    if (!hardwareId || typeof hardwareId !== 'string' || hardwareId.trim() === '') {
      throw new Error('El hardwareId es requerido y debe ser una cadena válida');
    }

    if (!message || typeof message !== 'string') {
      throw new Error('El mensaje es requerido y debe ser una cadena válida');
    }

    // Verificar conexión
    if (!this.client || !this.client.connected) {
      if (options.priority === 'high') {
        console.warn(`⚠️ [MQTT] Mensaje prioritario encolado - Cliente no conectado`);
        return this.enqueueMessage(hardwareId, message, options);
      } else {
        throw new Error('Cliente MQTT no está conectado para publicar');
      }
    }

    return this.publishInternal(hardwareId, message, options);
  }

  /**
   * @method publishInternal
   * @description Lógica interna de publicación optimizada
   * @param {string} hardwareId - ID del hardware
   * @param {string} message - Mensaje a publicar
   * @param {Object} options - Opciones de publicación
   * @returns {Promise<void>}
   * @private
   */
  private publishInternal(
    hardwareId: string, 
    message: string, 
    options: { qos?: 0 | 1 | 2; retain?: boolean; priority?: string }
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const topic = hardwareId.trim();
      const publishOptions = {
        qos: (options.qos || 1) as 0 | 1 | 2,
        retain: options.retain || false
      };

      // Métricas de inicio
      const startTime = Date.now();
      this.publishMetrics.totalMessages++;

      // Log optimizado (cada 10 mensajes)
      if (this.publishMetrics.totalMessages % 10 === 0) {
        console.log(`📤 [MQTT] Enviando mensaje ${this.publishMetrics.totalMessages} al topic "${topic}"`);
      }

      // Timeout optimizado
      const timeoutId = setTimeout(() => {
        this.publishMetrics.failedMessages++;
        reject(new Error(`Timeout al publicar en topic "${topic}" (${this.publishTimeout}ms)`));
      }, this.publishTimeout);

      this.client!.publish(topic, message, publishOptions, (err) => {
        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;
        
        if (err) {
          this.publishMetrics.failedMessages++;
          console.error(`❌ [MQTT] Error publicando en topic "${topic}":`, err);
          reject(new Error(`Error publicando: ${err.message}`));
        } else {
          this.publishMetrics.successfulMessages++;
          this.publishMetrics.lastPublishTime = new Date();
          
          // Calcular latencia promedio
          this.updateAverageLatency(latency);
          
          // Log de éxito cada 50 mensajes
          if (this.publishMetrics.successfulMessages % 50 === 0) {
            console.log(`✅ [MQTT] ${this.publishMetrics.successfulMessages} mensajes enviados exitosamente`);
          }
          
          resolve();
        }
      });

      // Agregar topic al cache
      this.topicCache.add(topic);
    });
  }

  /**
   * @method enqueueMessage
   * @description Encola un mensaje para envío posterior
   * @param {string} hardwareId - ID del hardware
   * @param {string} message - Mensaje
   * @param {Object} options - Opciones
   * @returns {Promise<void>}
   * @private
   */
  private enqueueMessage(hardwareId: string, message: string, options: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.publishQueue.push({
        topic: hardwareId,
        message,
        options,
        resolve,
        reject
      });

      // Limitar tamaño de cola
      if (this.publishQueue.length > 100) {
        const dropped = this.publishQueue.shift();
        if (dropped) {
          dropped.reject(new Error('Cola de mensajes llena, mensaje descartado'));
        }
      }
    });
  }

  /**
   * @method processPublishQueue
   * @description Procesa la cola de mensajes pendientes
   * @private
   */
  private async processPublishQueue(): Promise<void> {
    if (this.processingQueue || this.publishQueue.length === 0) {
      return;
    }

    this.processingQueue = true;
    console.log(`📦 [MQTT] Procesando ${this.publishQueue.length} mensajes en cola`);

    while (this.publishQueue.length > 0 && this.client?.connected) {
      const item = this.publishQueue.shift();
      if (!item) break;

      try {
        await this.publishInternal(item.topic, item.message, item.options);
        item.resolve();
      } catch (error) {
        item.reject(error);
      }

      // Pequeña pausa entre mensajes para no saturar
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.processingQueue = false;
    console.log(`✅ [MQTT] Cola de mensajes procesada`);
  }

  /**
   * @method publishOptimizedSensorValue
   * @description Publica solo el valor del sensor (máxima optimización)
   * @param {string} hardwareId - ID del hardware del sensor
   * @param {number} value - Valor del sensor
   * @param {Object} [options] - Opciones adicionales
   * @returns {Promise<void>}
   */
  public async publishOptimizedSensorValue(
    hardwareId: string, 
    value: number, 
    options: {
      includeTimestamp?: boolean;
      priority?: 'high' | 'normal' | 'low';
      qos?: 0 | 1 | 2;
    } = {}
  ): Promise<void> {
    // Validar valor
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('El valor debe ser un número válido');
    }

    let payload: string;
    
    if (options.includeTimestamp) {
      // Formato mínimo con timestamp
      const optimizedMessage: OptimizedMqttMessage = {
        value,
        timestamp: new Date().toISOString()
      };
      payload = JSON.stringify(optimizedMessage);
    } else {
      // Solo el valor (máxima optimización)
      payload = value.toString();
    }

    await this.publish(hardwareId, payload, {
      qos: options.qos || 1,
      retain: false,
      priority: options.priority || 'normal'
    });
  }

  /**
   * @method updateAverageLatency
   * @description Actualiza la latencia promedio usando media móvil
   * @param {number} newLatency - Nueva latencia medida
   * @private
   */
  private updateAverageLatency(newLatency: number): void {
    const alpha = 0.1; // Factor de suavizado para media móvil exponencial
    if (this.publishMetrics.averageLatency === 0) {
      this.publishMetrics.averageLatency = newLatency;
    } else {
      this.publishMetrics.averageLatency = 
        alpha * newLatency + (1 - alpha) * this.publishMetrics.averageLatency;
    }
  }

  /**
   * @method publishConnectionStatus
   * @description Publica el estado de conexión de forma optimizada
   * @param {'online' | 'offline'} status - Estado a publicar
   * @returns {Promise<void>}
   * @private
   */
  private async publishConnectionStatus(status: 'online' | 'offline'): Promise<void> {
    if (!this.client?.connected && status === 'online') return;

    try {
      // Mensaje de estado mínimo
      const statusMessage = {
        s: status, // 's' en lugar de 'status' para ahorrar bytes
        t: Date.now(), // timestamp numérico más compacto
        c: this.client?.options?.clientId?.slice(-8) || 'unknown' // solo últimos 8 chars
      };

      const statusTopic = 'acuaponia/status';
      
      if (this.client?.connected) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout status')), 3000);
          
          this.client!.publish(statusTopic, JSON.stringify(statusMessage), { qos: 1, retain: false }, (err) => {
            clearTimeout(timeout);
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
    } catch (error) {
      // No loggeamos errores de estado para evitar spam
    }
  }

  /**
   * @method disconnect
   * @description Desconecta del broker MQTT de forma limpia
   */
  public disconnect(): void {
    console.log('🔄 [MQTT] Iniciando desconexión...');
    
    // Limpiar timer de reconexión
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Procesar cola pendiente rápidamente
    if (this.publishQueue.length > 0) {
      console.log(`📦 [MQTT] Descartando ${this.publishQueue.length} mensajes en cola`);
      this.publishQueue.forEach(item => {
        item.reject(new Error('Desconexión solicitada'));
      });
      this.publishQueue = [];
    }

    // Publicar estado offline y desconectar
    this.publishConnectionStatus('offline').finally(() => {
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
      
      console.log('✅ [MQTT] Desconexión completada');
    });
  }

  /**
   * @method updateStatus
   * @description Actualiza el estado interno y notifica a los listeners
   * @param {Partial<MqttConnectionStatus>} updates - Actualizaciones del estado
   * @private
   */
  private updateStatus(updates: Partial<MqttConnectionStatus>): void {
    this.status = { ...this.status, ...updates };
    
    // Notificar a listeners (con manejo de errores)
    this.statusListeners.forEach(listener => {
      try {
        listener(this.status);
      } catch (error) {
        console.error(`❌ [MQTT] Error en listener de estado:`, error);
      }
    });
  }

  /**
   * @method notifyMetricsListeners
   * @description Notifica las métricas a los listeners
   * @private
   */
  private notifyMetricsListeners(): void {
    this.metricsListeners.forEach(listener => {
      try {
        listener(this.publishMetrics);
      } catch (error) {
        console.error(`❌ [MQTT] Error en listener de métricas:`, error);
      }
    });
  }

  // ==========================================
  // MÉTODOS PÚBLICOS DE INFORMACIÓN Y CONTROL
  // ==========================================

  /**
   * @method getStatus
   * @description Obtiene el estado actual de la conexión
   * @returns {MqttConnectionStatus} Estado actual
   */
  public getStatus(): MqttConnectionStatus {
    return { ...this.status };
  }

  /**
   * @method getMetrics
   * @description Obtiene las métricas de rendimiento
   * @returns {PublishMetrics} Métricas actuales
   */
  public getMetrics(): PublishMetrics {
    return { ...this.publishMetrics };
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
   * @method getConnectionInfo
   * @description Obtiene información detallada de la conexión
   * @returns {Object} Información de conexión completa
   */
  public getConnectionInfo() {
    return {
      status: this.status,
      metrics: this.publishMetrics,
      clientId: this.client?.options?.clientId || null,
      brokerUrl: process.env.NEXT_PUBLIC_MQTT_URL || null,
      connected: this.isConnected(),
      hasClient: !!this.client,
      topicsUsed: this.topicCache.size,
      queueSize: this.publishQueue.length,
      successRate: this.publishMetrics.totalMessages > 0 ? 
        (this.publishMetrics.successfulMessages / this.publishMetrics.totalMessages * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * @method clearMetrics
   * @description Reinicia las métricas de rendimiento
   */
  public clearMetrics(): void {
    this.publishMetrics = {
      totalMessages: 0,
      successfulMessages: 0,
      failedMessages: 0,
      averageLatency: 0,
      lastPublishTime: null
    };
    console.log('📊 [MQTT] Métricas reiniciadas');
  }

  /**
   * @method resetConnection
   * @description Reinicia la conexión MQTT completamente
   * @returns {Promise<void>}
   */
  public async resetConnection(): Promise<void> {
    console.log('🔄 [MQTT] Reiniciando conexión completamente...');
    
    this.disconnect();
    
    // Limpiar cache y métricas
    this.topicCache.clear();
    this.clearMetrics();
    
    // Esperar antes de reconectar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Reiniciar estado
    this.status.reconnectAttempts = 0;
    this.status.error = null;
    
    await this.connect();
  }

  // ==========================================
  // MÉTODOS DE SUSCRIPCIÓN A EVENTOS
  // ==========================================

  /**
   * @method onStatusChange
   * @description Registra un listener para cambios de estado
   * @param {Function} callback - Función callback
   * @returns {Function} Función para cancelar la suscripción
   */
  public onStatusChange(callback: (status: MqttConnectionStatus) => void): () => void {
    this.statusListeners.push(callback);
    
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
    
    return () => {
      const index = this.messageListeners.indexOf(callback);
      if (index > -1) {
        this.messageListeners.splice(index, 1);
      }
    };
  }

  /**
   * @method onMetrics
   * @description Registra un listener para métricas de rendimiento
   * @param {Function} callback - Función callback
   * @returns {Function} Función para cancelar la suscripción
   */
  public onMetrics(callback: (metrics: PublishMetrics) => void): () => void {
    this.metricsListeners.push(callback);
    
    return () => {
      const index = this.metricsListeners.indexOf(callback);
      if (index > -1) {
        this.metricsListeners.splice(index, 1);
      }
    };
  }
}

// Exportar instancia singleton
export const mqttService = MqttService.getInstance();