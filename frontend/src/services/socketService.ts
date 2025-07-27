import { io, Socket } from 'socket.io-client';
import { SensorData } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): void {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor Socket.IO');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado del servidor Socket.IO:', reason);
      this.handleReconnection();
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error);
      this.handleReconnection();
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reintentando conexión... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, Math.pow(2, this.reconnectAttempts) * 1000); // Backoff exponencial
    } else {
      console.error('❌ Máximo número de reintentos alcanzado');
    }
  }

  onSensorData(callback: (data: SensorData) => void): void {
    if (this.socket) {
      this.socket.on('sensor_data', callback);
    }
  }

  onAlert(callback: (alert: any) => void): void {
    if (this.socket) {
      this.socket.on('alert', callback);
    }
  }

  onSystemStatus(callback: (status: any) => void): void {
    if (this.socket) {
      this.socket.on('system_status', callback);
    }
  }

  emit(event: string, data: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const socketService = new SocketService();
export default socketService;