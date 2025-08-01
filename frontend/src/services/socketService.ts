import { io, Socket } from 'socket.io-client';
import { SensorData } from '../types';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No se puede conectar al socket: no hay token de autenticación.');
      return;
    }

    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';
    
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      auth: {
        token: token
      }
    });

    this.socket.on('connect', () => {
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason: Socket.DisconnectReason) => {
      console.log('❌ Desconectado del servidor Socket.IO:', reason);
      if (reason !== 'io server disconnect') {
        this.handleReconnection();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
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
      }, Math.pow(2, this.reconnectAttempts) * 1000);
    } else {
      console.error('❌ Máximo número de reintentos alcanzado');
    }
  }

  onSensorData(callback: (data: SensorData) => void): void {
    if (this.socket) {
      this.socket.on('new_sensor_data', callback);
    }
  }

  onAlert(callback: (alert: any) => void): void {
    if (this.socket) {
      this.socket.on('new_alert', callback);
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
