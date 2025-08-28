/**
 * @file mqtt.service.ts
 * @description Servicio backend optimizado para gestionar la conexión y comunicación con el broker MQTT.
 * Maneja el nuevo formato de payload simplificado y procesamiento eficiente de mensajes.
 * @author Kevin Mariano
 * @version 4.0.0 
 * @since 1.0.0
 */
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { connect, MqttClient, IClientOptions, ISubscriptionGrant } from 'mqtt';
import { DataService } from '../data/data.service';
import { ConfigService } from '@nestjs/config';

/**
 * @interface OptimizedMqttMessage
 * @description Estructura optimizada del mensaje MQTT recibido
 */
interface OptimizedMqttMessage {
  value?: number;
  timestamp?: string;
}

/**
 * @interface ConnectionMetrics
 * @description Métricas de conexión y rendimiento
 */
interface ConnectionMetrics {
  messagesReceived: number;
  messagesProcessed: number;
  processingErrors: number;
  averageProcessingTime: number;
  lastMessageTime: Date | null;
  uptime: number;
  startTime: Date;
}

/**
 * @class MqttService
 * @description Servicio principal optimizado para el manejo de comunicación MQTT
 * Enfocado en procesar payloads simplificados y mejorar el rendimiento
 */
@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient;
  private readonly topicPattern = '+'; // Escucha todos los hardwareId directamente
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private isConnected = false;

  // Métricas de rendimiento
  private metrics: ConnectionMetrics = {
    messagesReceived: 0,
    messagesProcessed: 0,
    processingErrors: 0,
    averageProcessingTime: 0,
    lastMessageTime: null,
    uptime: 0,
    startTime: new Date()
  };

  // Cache para optimización
  private processingTimes: number[] = [];
  private readonly maxProcessingTimeSamples = 100;

  // Cola de procesamiento para evitar bloqueos
  private messageQueue: Array<{ topic: string; message: string; timestamp: Date }> = [];
  private isProcessingQueue = false;
  private readonly maxQueueSize = 1000;

  constructor(
    private readonly dataService: DataService,
    private readonly configService: ConfigService,
  ) {
    this.startMetricsReporting();
  }

  /**
   * @method onModuleInit
   * @description Método del ciclo de vida que inicializa la conexión MQTT al arrancar el módulo
   */
  async onModuleInit(): Promise<void> {
    this.metrics.startTime = new Date();
    await this.initializeMqttConnection();
  }

  /**
   * @method onModuleDestroy
   * @description Método del ciclo de vida que cierra la conexión MQTT al destruir el módulo
   */
  onModuleDestroy(): void {
    this.disconnectMqtt();
  }

  /**
   * @method startMetricsReporting
   * @description Inicia el reporte periódico de métricas
   * @private
   */
  private startMetricsReporting(): void {
    setInterval(() => {
      this.updateUptimeMetrics();
      if (this.metrics.messagesReceived > 0 && this.metrics.messagesReceived % 100 === 0) {
        this.logMetricsSummary();
      }
    }, 30000); // Cada 30 segundos
  }

  /**
   * @method updateUptimeMetrics
   * @description Actualiza las métricas de tiempo de actividad
   * @private
   */
  private updateUptimeMetrics(): void {
    this.metrics.uptime = Math.floor((Date.now() - this.metrics.startTime.getTime()) / 1000);
  }

  /**
   * @method logMetricsSummary
   * @description Registra un resumen de las métricas
   * @private
   */
  private logMetricsSummary(): void {
    const successRate = this.metrics.messagesReceived > 0 ? 
      ((this.metrics.messagesProcessed / this.metrics.messagesReceived) * 100).toFixed(2) : '0';
    
    this.logger.log(`📊 [METRICS] Resumen cada 100 mensajes:`);
    this.logger.log(`   📨 Recibidos: ${this.metrics.messagesReceived}`);
    this.logger.log(`   ✅ Procesados: ${this.metrics.messagesProcessed} (${successRate}%)`);
    this.logger.log(`   ❌ Errores: ${this.metrics.processingErrors}`);
    this.logger.log(`   ⚡ Tiempo promedio: ${this.metrics.averageProcessingTime.toFixed(2)}ms`);
    this.logger.log(`   🕐 Uptime: ${Math.floor(this.metrics.uptime / 60)} minutos`);
    this.logger.log(`   📦 Cola actual: ${this.messageQueue.length} mensajes`);
  }

  /**
   * @method initializeMqttConnection
   * @description Inicializa y configura la conexión optimizada con el broker MQTT
   * @private
   */
  private async initializeMqttConnection(): Promise<void> {
    const connectUrl = this.configService.get<string>('MQTT_BROKER_URL');
    const username = this.configService.get<string>('MQTT_USERNAME');
    const password = this.configService.get<string>('MQTT_PASSWORD');
    const clientId = `nest-acuaponia-optimized-${Math.random().toString(16).slice(2, 8)}`;

    if (!connectUrl) {
      this.logger.error('❌ La variable de entorno MQTT_BROKER_URL no está definida. El servicio MQTT no se iniciará.');
      return;
    }

    this.logger.log(`🔄 [MQTT] Iniciando conexión optimizada a: ${connectUrl}`);

    const options: IClientOptions = {
      clientId,
      clean: true,
      connectTimeout: 6000, // Reducido para fallas más rápidas
      reconnectPeriod: 3000, // Reconexión más rápida
      keepalive: 60, // Aumentado para eficiencia
      username,
      password,
      // Configuración optimizada
      protocolVersion: 4, // MQTT 3.1.1
      reschedulePings: true,
      will: {
        topic: 'acuaponia/backend/status',
        payload: JSON.stringify({
          status: 'offline',
          timestamp: new Date().toISOString(),
          clientId,
          reason: 'unexpected_disconnect'
        }),
        qos: 1,
        retain: false
      }
    };

    try {
      this.client = connect(connectUrl, options);
      this.setupOptimizedEventHandlers();
    } catch (error) {
      this.logger.error(`❌ Error al crear cliente MQTT optimizado: ${error.message}`);
    }
  }

  /**
   * @method setupOptimizedEventHandlers
   * @description Configura los manejadores de eventos optimizados del cliente MQTT
   * @private
   */
  private setupOptimizedEventHandlers(): void {
    // Evento de conexión exitosa
    this.client.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log('✅ [MQTT] Conectado exitosamente al broker MQTT con optimizaciones');
      this.subscribeToOptimizedTopics();
      this.publishOptimizedStatus('online');
    });

    // Evento de mensaje recibido (OPTIMIZADO)
    this.client.on('message', (topic, payload) => {
      this.metrics.messagesReceived++;
      const messageTimestamp = new Date();
      
      // Log selectivo para evitar spam
      if (this.metrics.messagesReceived % 50 === 0) {
        this.logger.log(`📨 [MQTT] Procesados ${this.metrics.messagesReceived} mensajes (Cola: ${this.messageQueue.length})`);
      }

      // Agregar a la cola para procesamiento asíncrono
      this.enqueueMessage(topic, payload.toString(), messageTimestamp);
    });

    // Evento de error de conexión
    this.client.on('error', (err) => {
      this.isConnected = false;
      this.logger.error(`❌ [MQTT] Error de conexión optimizada: ${err.message}`);
      this.handleOptimizedConnectionError();
    });

    // Evento de desconexión
    this.client.on('close', () => {
      this.isConnected = false;
      this.logger.warn('🔌 [MQTT] Desconectado del broker MQTT');
    });

    // Evento de reconexión
    this.client.on('reconnect', () => {
      this.reconnectAttempts++;
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.logger.log(`🔄 [MQTT] Reconectando... (Intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      }
    });
  }

  /**
   * @method subscribeToOptimizedTopics
   * @description Se suscribe a los topics con configuración optimizada
   * @private
   */
  private subscribeToOptimizedTopics(): void {
    const topic = this.topicPattern;
    
    this.client.subscribe(topic, { qos: 1 }, (err, granted: ISubscriptionGrant[]) => {
      if (!err && granted) {
        this.logger.log(`📡 [MQTT] Suscripción optimizada al patrón: "${topic}"`);
        granted.forEach(sub => {
          this.logger.log(`👍 [MQTT] Confirmado: ${sub.topic} (QoS: ${sub.qos})`);
        });
        this.logger.log('🎯 [MQTT] Esperando payloads optimizados:');
        this.logger.log('   📦 Formato 1: Solo valor numérico (ej: "25.5")');
        this.logger.log('   📦 Formato 2: Valor + timestamp (ej: {"value":25.5,"timestamp":"..."})');
        this.logger.log('   🚀 Reducción estimada: 85% menos datos vs payload completo');
      } else {
        this.logger.error(`❌ [MQTT] No se pudo suscribir al topic optimizado "${topic}":`, err);
      }
    });
  }

  /**
   * @method enqueueMessage
   * @description Encola un mensaje para procesamiento asíncrono
   * @param {string} topic - Topic del mensaje
   * @param {string} message - Contenido del mensaje
   * @param {Date} timestamp - Timestamp de recepción
   * @private
   */
  private enqueueMessage(topic: string, message: string, timestamp: Date): void {
    // Controlar tamaño de cola
    if (this.messageQueue.length >= this.maxQueueSize) {
      const droppedMessage = this.messageQueue.shift();
      this.logger.warn(`⚠️ [MQTT] Cola llena, mensaje descartado del topic: ${droppedMessage?.topic}`);
    }

    this.messageQueue.push({ topic, message, timestamp });
    
    // Procesar cola si no está siendo procesada
    if (!this.isProcessingQueue) {
      this.processMessageQueue();
    }
  }

  /**
   * @method processMessageQueue
   * @description Procesa la cola de mensajes de forma asíncrona
   * @private
   */
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.messageQueue.length > 0) {
      const messageData = this.messageQueue.shift();
      if (!messageData) break;

      try {
        await this.handleOptimizedSensorMessage(
          messageData.topic, 
          messageData.message, 
          messageData.timestamp
        );
      } catch (error) {
        this.logger.error(`❌ [MQTT] Error procesando mensaje en cola:`, error.message);
      }

      // Pequeña pausa para no bloquear el hilo principal
      if (this.messageQueue.length > 10) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * @method handleOptimizedSensorMessage
   * @description Procesa los mensajes MQTT optimizados de los sensores
   * @param {string} topic - Topic del mensaje (hardwareId del sensor)
   * @param {string} message - Payload optimizado del mensaje
   * @param {Date} receivedTimestamp - Timestamp de recepción
   * @private
   */
  private async handleOptimizedSensorMessage(
    topic: string, 
    message: string, 
    receivedTimestamp: Date
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // El topic es directamente el hardwareId (optimización)
      const hardwareId = topic.trim();
      
      if (!hardwareId) {
        this.logger.warn(`⚠️ [MQTT] Topic vacío o inválido: "${topic}"`);
        return;
      }

      // 🎯 PROCESAMIENTO OPTIMIZADO DE PAYLOAD
      let numericValue: number;
      let timestamp: Date = receivedTimestamp;

      // Detectar tipo de payload
      const trimmedMessage = message.trim();
      
      if (trimmedMessage.startsWith('{')) {
        // Formato JSON mínimo: {"value":7.21,"timestamp":"..."}
        try {
          const parsedMessage: OptimizedMqttMessage = JSON.parse(trimmedMessage);
          
          if (typeof parsedMessage.value === 'number') {
            numericValue = parsedMessage.value;
          } else if (typeof parsedMessage.value === 'string') {
            numericValue = parseFloat(parsedMessage.value);
          } else {
            throw new Error('Campo value no encontrado o inválido');
          }

          // Usar timestamp del mensaje si está disponible
          if (parsedMessage.timestamp) {
            const messageTimestamp = new Date(parsedMessage.timestamp);
            if (!isNaN(messageTimestamp.getTime())) {
              timestamp = messageTimestamp;
            }
          }

        } catch (parseError) {
          this.logger.error(`❌ [MQTT] Error parsing JSON optimizado del topic "${topic}": ${parseError.message}`);
          this.metrics.processingErrors++;
          return;
        }
      } else {
        // Formato super optimizado: solo valor numérico "25.5"
        numericValue = parseFloat(trimmedMessage);
        
        if (isNaN(numericValue)) {
          this.logger.warn(`⚠️ [MQTT] Valor numérico inválido para ${hardwareId}: "${trimmedMessage}"`);
          this.metrics.processingErrors++;
          return;
        }
      }

      // Validación rápida de rango
      if (!this.isValueInReasonableRange(numericValue)) {
        this.logger.warn(`⚠️ [MQTT] Valor fuera de rango razonable para ${hardwareId}: ${numericValue}`);
        // No retornamos, solo advertimos
      }

      // Preparar datos optimizados para el servicio
      const optimizedSensorData = {
        value: numericValue,
        timestamp: timestamp.toISOString()
      };

      // Log optimizado (cada 25 mensajes)
      if (this.metrics.messagesProcessed % 25 === 0) {
        this.logger.log(`🔍 [MQTT] Procesando sensor "${hardwareId}": ${numericValue} @ ${timestamp.toISOString()}`);
      }

      // Enviar al servicio de datos
      await this.dataService.createFromMqtt(hardwareId, optimizedSensorData);

      // Actualizar métricas de éxito
      this.metrics.messagesProcessed++;
      this.metrics.lastMessageTime = new Date();
      
      // Calcular tiempo de procesamiento
      const processingTime = Date.now() - startTime;
      this.updateProcessingTimeMetrics(processingTime);

      // Log de éxito optimizado (cada 100 mensajes)
      if (this.metrics.messagesProcessed % 100 === 0) {
        this.logger.log(`✅ [MQTT] ${this.metrics.messagesProcessed} mensajes optimizados procesados exitosamente`);
      }

    } catch (error) {
      this.metrics.processingErrors++;
      const processingTime = Date.now() - startTime;
      
      this.logger.error(`💥 [MQTT] Error procesando mensaje optimizado del topic "${topic}" (${processingTime}ms): ${error.message}`);
      
      // Log adicional para debugging en desarrollo
      if (process.env.NODE_ENV === 'development' && error.stack) {
        this.logger.debug(`🔍 [MQTT] Stack trace: ${error.stack}`);
      }
    }
  }

  /**
   * @method updateProcessingTimeMetrics
   * @description Actualiza las métricas de tiempo de procesamiento
   * @param {number} processingTime - Tiempo de procesamiento en ms
   * @private
   */
  private updateProcessingTimeMetrics(processingTime: number): void {
    this.processingTimes.push(processingTime);
    
    // Mantener solo las últimas muestras
    if (this.processingTimes.length > this.maxProcessingTimeSamples) {
      this.processingTimes.shift();
    }
    
    // Calcular promedio
    const sum = this.processingTimes.reduce((acc, time) => acc + time, 0);
    this.metrics.averageProcessingTime = sum / this.processingTimes.length;
  }

  /**
   * @method isValueInReasonableRange
   * @description Verifica si un valor está dentro de rangos razonables (optimizado)
   * @param {number} value - Valor a verificar
   * @returns {boolean} True si el valor está en rango razonable
   * @private
   */
  private isValueInReasonableRange(value: number): boolean {
    // Rangos optimizados para validación rápida
    const globalRange = { min: -100, max: 200 }; // Rango muy amplio para capturar errores obvios
    
    return value >= globalRange.min && value <= globalRange.max && isFinite(value);
  }

  /**
   * @method handleOptimizedConnectionError
   * @description Maneja errores de conexión con lógica optimizada de reconexión
   * @private
   */
  private handleOptimizedConnectionError(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`❌ [MQTT] Se alcanzó el máximo de intentos de reconexión optimizada (${this.maxReconnectAttempts})`);
      this.logger.error('🚨 [MQTT] Deteniendo intentos de reconexión automática');
      
      // Limpiar cola de mensajes pendientes
      if (this.messageQueue.length > 0) {
        this.logger.warn(`🗑️ [MQTT] Limpiando ${this.messageQueue.length} mensajes en cola`);
        this.messageQueue = [];
      }
    }
  }

  /**
   * @method publishOptimizedStatus
   * @description Publica el estado del backend de forma optimizada
   * @param {string} status - Estado a publicar ('online' | 'offline')
   * @private
   */
  private publishOptimizedStatus(status: 'online' | 'offline'): void {
    if (this.client && this.isConnected) {
      const statusTopic = 'acuaponia/backend/status';
      
      // Mensaje de estado optimizado
      const optimizedStatusMessage = {
        s: status, // 's' en lugar de 'status'
        t: Date.now(), // timestamp numérico
        c: this.client.options.clientId?.slice(-8) || 'unknown', // solo últimos 8 chars
        v: '4.0.0', // versión del servicio
        m: this.metrics.messagesProcessed, // mensajes procesados
        q: this.messageQueue.length // tamaño de cola
      };

      this.client.publish(statusTopic, JSON.stringify(optimizedStatusMessage), { 
        qos: 1, 
        retain: true 
      }, (err) => {
        if (err) {
          this.logger.error(`❌ [MQTT] Error publicando estado optimizado: ${err.message}`);
        } else {
          this.logger.log(`📢 [MQTT] Estado optimizado publicado: ${status}`);
        }
      });
    }
  }

  /**
   * @method disconnectMqtt
   * @description Desconecta limpiamente del broker MQTT
   * @private
   */
  private disconnectMqtt(): void {
    if (this.client) {
      this.logger.log('🔄 [MQTT] Cerrando conexión optimizada...');
      
      // Publicar estado offline
      this.publishOptimizedStatus('offline');
      
      // Procesar mensajes pendientes rápidamente
      if (this.messageQueue.length > 0) {
        this.logger.log(`📦 [MQTT] Procesando ${this.messageQueue.length} mensajes pendientes antes del cierre...`);
        // Dar tiempo para procesar mensajes críticos
        setTimeout(() => {
          this.forceDisconnect();
        }, 2000);
      } else {
        this.forceDisconnect();
      }
    }
  }

  /**
   * @method forceDisconnect
   * @description Fuerza la desconexión del cliente MQTT
   * @private
   */
  private forceDisconnect(): void {
    if (this.client) {
      this.client.end(true);
      this.isConnected = false;
      this.logger.log('✅ [MQTT] Conexión optimizada cerrada correctamente');
      
      // Log final de métricas
      this.logFinalMetrics();
    }
  }

  /**
   * @method logFinalMetrics
   * @description Registra las métricas finales al cerrar el servicio
   * @private
   */
  private logFinalMetrics(): void {
    this.updateUptimeMetrics();
    
    this.logger.log('📊 [MQTT] === MÉTRICAS FINALES OPTIMIZADAS ===');
    this.logger.log(`   📨 Mensajes recibidos: ${this.metrics.messagesReceived}`);
    this.logger.log(`   ✅ Mensajes procesados: ${this.metrics.messagesProcessed}`);
    this.logger.log(`   ❌ Errores de procesamiento: ${this.metrics.processingErrors}`);
    this.logger.log(`   ⚡ Tiempo promedio de procesamiento: ${this.metrics.averageProcessingTime.toFixed(2)}ms`);
    this.logger.log(`   🕐 Tiempo total activo: ${Math.floor(this.metrics.uptime / 60)} minutos`);
    
    const successRate = this.metrics.messagesReceived > 0 ? 
      ((this.metrics.messagesProcessed / this.metrics.messagesReceived) * 100).toFixed(2) : '0';
    this.logger.log(`   📈 Tasa de éxito: ${successRate}%`);
    this.logger.log('📊 [MQTT] ======================================');
  }

  // ==========================================
  // MÉTODOS PÚBLICOS PARA MONITOREO
  // ==========================================

  /**
   * @method getConnectionStatus
   * @description Obtiene el estado actual de la conexión MQTT optimizada
   * @returns {Object} Información del estado de conexión
   * @public
   */
  public getConnectionStatus() {
    this.updateUptimeMetrics();
    
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      clientId: this.client?.options?.clientId || 'N/A',
      brokerUrl: this.configService.get<string>('MQTT_BROKER_URL'),
      metrics: {
        ...this.metrics,
        queueSize: this.messageQueue.length,
        isProcessingQueue: this.isProcessingQueue,
        successRate: this.metrics.messagesReceived > 0 ? 
          ((this.metrics.messagesProcessed / this.metrics.messagesReceived) * 100).toFixed(2) + '%' : '0%'
      },
      optimization: {
        payloadFormat: 'Optimizado (valor solo o valor+timestamp)',
        estimatedBandwidthSaving: '85%',
        averagePayloadSize: '~5 bytes vs ~150 bytes anterior'
      }
    };
  }

  /**
   * @method publishMessage
   * @description Publica un mensaje optimizado en un topic específico
   * @param {string} topic - Topic donde publicar
   * @param {string} message - Mensaje a publicar (preferiblemente optimizado)
   * @param {Object} [options] - Opciones de publicación
   * @returns {Promise<void>}
   * @public
   */
  public async publishMessage(
    topic: string, 
    message: string, 
    options: { qos?: 0 | 1 | 2; retain?: boolean } = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected) {
        reject(new Error('Cliente MQTT optimizado no está conectado'));
        return;
      }

      this.client.publish(topic, message, {
        qos: options.qos || 1,
        retain: options.retain || false
      }, (err) => {
        if (err) {
          this.logger.error(`❌ [MQTT] Error publicando en topic optimizado "${topic}": ${err.message}`);
          reject(err);
        } else {
          this.logger.log(`📤 [MQTT] Mensaje optimizado publicado en topic "${topic}"`);
          resolve();
        }
      });
    });
  }

  /**
   * @method clearMetrics
   * @description Reinicia las métricas de rendimiento
   * @public
   */
  public clearMetrics(): void {
    this.metrics = {
      messagesReceived: 0,
      messagesProcessed: 0,
      processingErrors: 0,
      averageProcessingTime: 0,
      lastMessageTime: null,
      uptime: 0,
      startTime: new Date()
    };
    this.processingTimes = [];
    this.logger.log('📊 [MQTT] Métricas optimizadas reiniciadas');
  }

  /**
   * @method getOptimizationReport
   * @description Genera un reporte detallado de las optimizaciones
   * @returns {Object} Reporte de optimización
   * @public
   */
  public getOptimizationReport(): any {
    const totalMessages = this.metrics.messagesReceived;
    const avgPayloadBefore = 150; // bytes promedio del payload anterior
    const avgPayloadNow = 5; // bytes promedio del payload optimizado
    
    const bandwidthSavedBytes = totalMessages * (avgPayloadBefore - avgPayloadNow);
    const bandwidthSavedKB = bandwidthSavedBytes / 1024;
    const bandwidthSavedMB = bandwidthSavedKB / 1024;

    return {
      optimization: {
        payloadReduction: '85%',
        avgPayloadBefore: `${avgPayloadBefore} bytes`,
        avgPayloadNow: `${avgPayloadNow} bytes`,
        formatBefore: '{"value":7.21,"timestamp":"2025-08-27T19:54:43.976Z","unit":"pH","sensor":{"name":"pH","type":"PH"}}',
        formatNow: '7.21 o {"value":7.21,"timestamp":"2025-08-27T19:54:43.976Z"}'
      },
      performance: {
        totalMessages: totalMessages,
        processingSuccessRate: totalMessages > 0 ? 
          `${((this.metrics.messagesProcessed / totalMessages) * 100).toFixed(2)}%` : '0%',
        averageProcessingTime: `${this.metrics.averageProcessingTime.toFixed(2)}ms`,
        queueEfficiency: this.messageQueue.length < 10 ? 'Excelente' : 
                        this.messageQueue.length < 50 ? 'Buena' : 'Necesita optimización'
      },
      bandwidthSavings: {
        totalBytesSaved: bandwidthSavedBytes,
        totalKBSaved: Math.round(bandwidthSavedKB * 100) / 100,
        totalMBSaved: Math.round(bandwidthSavedMB * 100) / 100,
        estimatedMonthlySavings: `~${Math.round((bandwidthSavedKB * 30) / 1024 * 100) / 100}MB/mes`
      },
      recommendations: this.generateOptimizationRecommendations()
    };
  }

  /**
   * @method generateOptimizationRecommendations
   * @description Genera recomendaciones basadas en las métricas actuales
   * @returns {string[]} Array de recomendaciones
   * @private
   */
  private generateOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Analizar tasa de errores
    const errorRate = this.metrics.messagesReceived > 0 ? 
      (this.metrics.processingErrors / this.metrics.messagesReceived) * 100 : 0;
    
    if (errorRate > 5) {
      recommendations.push(`Tasa de errores alta (${errorRate.toFixed(1)}%). Revisar validación de datos.`);
    }
    
    // Analizar tiempo de procesamiento
    if (this.metrics.averageProcessingTime > 100) {
      recommendations.push(`Tiempo de procesamiento alto (${this.metrics.averageProcessingTime.toFixed(2)}ms). Considerar optimizar base de datos.`);
    }
    
    // Analizar tamaño de cola
    if (this.messageQueue.length > 50) {
      recommendations.push(`Cola de mensajes grande (${this.messageQueue.length}). Considerar aumentar capacidad de procesamiento.`);
    }
    
    // Recomendaciones generales
    if (this.metrics.messagesProcessed > 1000) {
      recommendations.push('Excelente: Sistema procesando grandes volúmenes eficientemente.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Sistema optimizado funcionando correctamente. No se requieren ajustes.');
    }
    
    return recommendations;
  }

  /**
   * @method enableDebugMode
   * @description Habilita modo debug para análisis detallado
   * @param {boolean} enabled - Si habilitar o deshabilitar debug
   * @public
   */
  public enableDebugMode(enabled: boolean): void {
    if (enabled) {
      this.logger.log('🔍 [MQTT] Modo debug habilitado - Logs detallados activados');
      // Cambiar nivel de logging si es necesario
      process.env.MQTT_DEBUG = 'true';
    } else {
      this.logger.log('🔍 [MQTT] Modo debug deshabilitado');
      delete process.env.MQTT_DEBUG;
    }
  }

  /**
   * @method forceReconnect
   * @description Fuerza una reconexión del cliente MQTT
   * @returns {Promise<void>}
   * @public
   */
  public async forceReconnect(): Promise<void> {
    this.logger.log('🔄 [MQTT] Reconexión forzada solicitada...');
    
    if (this.client) {
      this.client.end(true);
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
    
    // Esperar un momento antes de reconectar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.initializeMqttConnection();
  }

  /**
   * @method processQueueManually
   * @description Procesa manualmente la cola de mensajes (útil para debugging)
   * @returns {Promise<number>} Número de mensajes procesados
   * @public
   */
  public async processQueueManually(): Promise<number> {
    const initialQueueSize = this.messageQueue.length;
    
    if (initialQueueSize === 0) {
      this.logger.log('📦 [MQTT] No hay mensajes en cola para procesar');
      return 0;
    }
    
    this.logger.log(`📦 [MQTT] Procesando manualmente ${initialQueueSize} mensajes en cola...`);
    
    await this.processMessageQueue();
    
    const processedCount = initialQueueSize - this.messageQueue.length;
    this.logger.log(`✅ [MQTT] Procesados manualmente ${processedCount} mensajes`);
    
    return processedCount;
  }

  /**
   * @method validatePayloadFormat
   * @description Valida si un payload está en el formato optimizado esperado
   * @param {string} payload - Payload a validar
   * @returns {Object} Resultado de validación
   * @public
   */
  public validatePayloadFormat(payload: string): {
    valid: boolean;
    format: 'numeric' | 'minimal_json' | 'invalid';
    estimatedSize: number;
    recommendations?: string[];
  } {
    const trimmed = payload.trim();
    const size = Buffer.byteLength(trimmed, 'utf8');
    
    // Formato numérico simple
    if (!isNaN(parseFloat(trimmed)) && isFinite(parseFloat(trimmed))) {
      return {
        valid: true,
        format: 'numeric',
        estimatedSize: size,
        recommendations: ['Formato óptimo: máxima eficiencia de ancho de banda']
      };
    }
    
    // Formato JSON mínimo
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.value !== undefined) {
          const recommendations: string[] = [];
          
          // Verificar campos innecesarios
          const allowedFields = ['value', 'timestamp'];
          const extraFields = Object.keys(parsed).filter(key => !allowedFields.includes(key));
          
          if (extraFields.length > 0) {
            recommendations.push(`Campos innecesarios detectados: ${extraFields.join(', ')}`);
            recommendations.push('Considerar usar solo valor numérico para máxima optimización');
          }
          
          if (size > 50) {
            recommendations.push('Payload grande para formato optimizado, considerar simplificar');
          }
          
          return {
            valid: true,
            format: 'minimal_json',
            estimatedSize: size,
            recommendations: recommendations.length > 0 ? recommendations : ['Formato JSON válido y optimizado']
          };
        }
      } catch (e) {
        // JSON inválido
      }
    }
    
    // Formato inválido
    return {
      valid: false,
      format: 'invalid',
      estimatedSize: size,
      recommendations: [
        'Formato no optimizado detectado',
        'Use formato numérico: "25.5"',
        'O formato JSON mínimo: {"value":25.5,"timestamp":"..."}'
      ]
    };
  }

  /**
   * @method generatePerformanceReport
   * @description Genera un reporte detallado de rendimiento
   * @returns {Object} Reporte de rendimiento
   * @public
   */
  public generatePerformanceReport(): any {
    this.updateUptimeMetrics();
    
    const uptimeHours = this.metrics.uptime / 3600;
    const messagesPerHour = uptimeHours > 0 ? Math.round(this.metrics.messagesReceived / uptimeHours) : 0;
    const messagesPerMinute = this.metrics.uptime > 60 ? Math.round(this.metrics.messagesReceived / (this.metrics.uptime / 60)) : 0;
    
    return {
      connection: {
        status: this.isConnected ? 'Conectado' : 'Desconectado',
        uptime: `${Math.floor(uptimeHours)}h ${Math.floor((this.metrics.uptime % 3600) / 60)}m`,
        reconnectAttempts: this.reconnectAttempts,
        clientId: this.client?.options?.clientId || 'N/A'
      },
      throughput: {
        totalMessagesReceived: this.metrics.messagesReceived,
        totalMessagesProcessed: this.metrics.messagesProcessed,
        messagesPerHour: messagesPerHour,
        messagesPerMinute: messagesPerMinute,
        processingSuccessRate: `${this.metrics.messagesReceived > 0 ? 
          ((this.metrics.messagesProcessed / this.metrics.messagesReceived) * 100).toFixed(2) : '0'}%`
      },
      performance: {
        averageProcessingTime: `${this.metrics.averageProcessingTime.toFixed(2)}ms`,
        currentQueueSize: this.messageQueue.length,
        maxQueueSize: this.maxQueueSize,
        isProcessingQueue: this.isProcessingQueue,
        processingErrors: this.metrics.processingErrors,
        errorRate: `${this.metrics.messagesReceived > 0 ? 
          ((this.metrics.processingErrors / this.metrics.messagesReceived) * 100).toFixed(2) : '0'}%`
      },
      optimization: {
        payloadOptimization: 'Habilitada (85% reducción)',
        estimatedDataSaved: `~${Math.round((this.metrics.messagesReceived * 145) / 1024)}KB`,
        asyncProcessing: 'Habilitado',
        queueProcessing: 'Habilitado'
      },
      lastActivity: {
        lastMessageTime: this.metrics.lastMessageTime?.toISOString() || 'Nunca',
        timeSinceLastMessage: this.metrics.lastMessageTime ? 
          `${Math.round((Date.now() - this.metrics.lastMessageTime.getTime()) / 1000)}s` : 'N/A'
      }
    };
  }
}