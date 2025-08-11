import { io, Socket } from 'socket.io-client';
import { SensorData } from '../types';

/**
 * @class SocketService
 * @description Servicio singleton para gestionar la conexión WebSocket con el backend.
 */
class SocketService {
  private socket: Socket | null = null;
  private readonly apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

  /**
   * @method connect
   * @description Establece la conexión con el servidor de sockets.
   */
  public connect(): void {
    if (this.socket && this.socket.connected) {
      return;
    }
    this.socket = io(this.apiUrl, {
      // Forzar el transporte a websocket puede ayudar a evitar problemas de conectividad.
      transports: ['websocket'],
      // Desactivar reintentos automáticos para tener más control en la UI si es necesario.
      reconnection: true,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Conectado al servidor Socket.IO');
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`❌ Desconectado del servidor Socket.IO: ${reason}`);
    });

    this.socket.on('connect_error', (err) => {
        console.error(`Error de conexión de Socket.IO: ${err.message}`);
    });
  }

  /**
   * @method disconnect
   * @description Cierra la conexión activa del socket.
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * @method onSensorData
   * @description Se suscribe a los eventos 'new_sensor_data' del servidor.
   */
  public onSensorData(callback: (data: SensorData) => void): void {
    if (this.socket) {
      this.socket.on('new_sensor_data', callback);
    }
  }

  /**
   * @method offSensorData
   * @description Se desuscribe de los eventos 'new_sensor_data'.
   */
  public offSensorData(callback: (data: SensorData) => void): void {
    if (this.socket) {
      this.socket.off('new_sensor_data', callback);
    }
  }
}

export const socketService = new SocketService();