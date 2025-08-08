import { io, Socket } from 'socket.io-client';
import { SensorData } from '../types';

/**
 * @class SocketService
 * @description Servicio singleton para gestionar la conexión WebSocket con el backend.
 * Se encarga de conectar, desconectar y manejar los eventos de datos de sensores en tiempo real.
 */
class SocketService {
  private socket: Socket | null = null;
  private readonly apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  /**
   * @method connect
   * @description Establece la conexión con el servidor de sockets.
   * Si ya existe una conexión, no hace nada.
   */
  public connect(): void {
    if (this.socket && this.socket.connected) {
      return;
    }
    this.socket = io(this.apiUrl, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Conectado al servidor Socket.IO');
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`❌ Desconectado del servidor Socket.IO: ${reason}`);
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
   * @param {(data: SensorData) => void} callback - La función que se ejecutará cada vez que lleguen nuevos datos.
   */
  public onSensorData(callback: (data: SensorData) => void): void {
    if (this.socket) {
      this.socket.on('new_sensor_data', callback);
    }
  }

  /**
   * @method offSensorData
   * @description Se desuscribe de los eventos 'new_sensor_data' para evitar fugas de memoria.
   * @param {(data: SensorData) => void} callback - La misma función de callback usada en onSensorData.
   */
  public offSensorData(callback: (data: SensorData) => void): void {
    if (this.socket) {
      this.socket.off('new_sensor_data', callback);
    }
  }
}

// Exportamos una única instancia del servicio (patrón Singleton)
export const socketService = new SocketService();