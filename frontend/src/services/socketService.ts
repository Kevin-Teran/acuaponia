import { io, Socket } from 'socket.io-client';
import { SensorData, Report } from '../types';

/**
 * @fileoverview Servicio Singleton para gestionar la conexión WebSocket con el backend.
 * Este servicio asegura que solo exista una instancia de la conexión de socket
 * durante todo el ciclo de vida de la aplicación, evitando reconexiones innecesarias
 * al navegar entre diferentes componentes.
 */
class SocketService {
  /**
   * @private
   * @type {Socket | null}
   * @description Almacena la instancia del cliente de Socket.IO. Es nulo si no está conectado.
   */
  private socket: Socket | null = null;

  /**
   * @private
   * @type {Promise<void> | null}
   * @description Se utiliza para gestionar intentos de conexión concurrentes. Si se llama a `connect()`
   * mientras ya hay una conexión en curso, se devuelve esta promesa en lugar de crear una nueva conexión.
   */
  private connectionPromise: Promise<void> | null = null;

  /**
   * @private
   * @readonly
   * @type {string}
   * @description Lee la URL del servidor de Sockets desde las variables de entorno (.env).
   * Si no se encuentra, utiliza un valor por defecto para el desarrollo local.
   */
  private readonly socketUrl: string = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

  /**
   * @public
   * @method connect
   * @description Inicia y gestiona la conexión con el servidor de Socket.IO.
   * Es un método "idempotente": si ya está conectado, no hace nada. Si se está conectando,
   * espera a que la conexión actual termine.
   * @returns {Promise<void>} Una promesa que se resuelve cuando la conexión es exitosa o se rechaza si falla.
   */
  public connect(): Promise<void> {
    if (this.socket && this.socket.connected) {
      return Promise.resolve();
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (!this.socketUrl) {
      console.error('❌ Error Crítico: La variable de entorno VITE_SOCKET_URL no está definida.');
      return Promise.reject(new Error('VITE_SOCKET_URL no está configurada.'));
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      console.log(`🔌 Intentando conectar al servidor de Sockets en: ${this.socketUrl}`);
      
      this.socket = io(this.socketUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });


      this.socket.on('connect', () => {
        console.log(`✅ Conectado al servidor Socket.IO con ID: ${this.socket!.id}`);
        this.connectionPromise = null; 
        resolve();
      });

      this.socket.on('disconnect', (reason: string) => {
        console.warn(`🔌 Desconectado del servidor Socket.IO: ${reason}`);
      });
      
      this.socket.on('connect_error', (err: Error) => {
        console.error(`❌ Error de conexión de Socket.IO: ${err.message}`);
        this.connectionPromise = null; 
        this.disconnect();
        reject(err);
      });
    });

    return this.connectionPromise;
  }

  /**
   * @public
   * @method disconnect
   * @description Cierra la conexión de Socket.IO de forma segura.
   */
  public disconnect(): void {
    if (this.socket) {
      console.log('🔌 Cerrando la conexión de socket...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * @public
   * @method onSensorData
   * @description Se suscribe a los eventos de nuevos datos de sensores.
   * @param {(data: SensorData) => void} callback - La función a ejecutar cuando se recibe un dato.
   */
  public onSensorData(callback: (data: SensorData) => void): void {
    if (this.socket) {
      this.socket.on('new_sensor_data', callback);
    } else {
      console.warn('Socket no conectado. No se pudo suscribir a "new_sensor_data".');
    }
  }

  /**
   * @public
   * @method offSensorData
   * @description Se desuscribe de los eventos de nuevos datos de sensores para evitar fugas de memoria.
   * @param {(data: SensorData) => void} callback - La función que se usó para la suscripción.
   */
  public offSensorData(callback: (data: SensorData) => void): void {
    if (this.socket) {
      this.socket.off('new_sensor_data', callback);
    }
  }
  
  /**
   * @public
   * @method onReportUpdate
   * @description Se suscribe a los eventos de actualización del estado de los reportes.
   * @param {(report: Report) => void} callback - La función a ejecutar cuando un reporte cambia de estado.
   */
  public onReportUpdate(callback: (report: Report) => void): void {
    if (this.socket) {
      this.socket.on('report_status_update', callback);
    } else {
      console.warn('Socket no conectado. No se pudo suscribir a "report_status_update".');
    }
  }

  /**
   * @public
   * @method offReportUpdate
   * @description Se desuscribe de los eventos de actualización de reportes.
   * @param {(report: Report) => void} callback - La función que se usó para la suscripción.
   */
  public offReportUpdate(callback: (report: Report) => void): void {
    if (this.socket) {
      this.socket.off('report_status_update', callback);
    }
  }
}

export const socketService = new SocketService();