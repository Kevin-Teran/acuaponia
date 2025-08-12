import { io, Socket } from 'socket.io-client';
import { SensorData, Report } from '../types';

/**
 * @class SocketService
 * @description Servicio singleton para gestionar la conexión WebSocket con el backend.
 */
class SocketService {
  private socket: Socket | null = null;
  private readonly apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

  public connect(): void {
    if (this.socket && this.socket.connected) {
      return;
    }
    this.socket = io(this.apiUrl, {
      transports: ['websocket'],
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

  public disconnect(): void {
    if (this.socket) {
      console.log('Cerrando conexión de socket de forma controlada...'); // Log para confirmar la llamada
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public onSensorData(callback: (data: SensorData) => void): void {
    if (this.socket) {
      this.socket.on('new_sensor_data', callback);
    }
  }

  public offSensorData(callback: (data: SensorData) => void): void {
    if (this.socket) {
      this.socket.off('new_sensor_data', callback);
    }
  }

  /**
   * @method onReportUpdate
   * @description Se suscribe a los eventos de actualización de reportes.
   */
  public onReportUpdate(callback: (report: Report) => void): void {
      if (this.socket) {
          this.socket.on('report_status_update', callback);
      }
  }

  /**
   * @method offReportUpdate
   * @description Se desuscribe de los eventos de actualización de reportes.
   */
  public offReportUpdate(callback: (report: Report) => void): void {
      if (this.socket) {
          this.socket.off('report_status_update', callback);
      }
  }
}

export const socketService = new SocketService();