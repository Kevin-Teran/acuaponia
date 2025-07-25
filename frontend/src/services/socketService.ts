import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(token: string) {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    
    this.socket = io(SOCKET_URL, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    this.setupEventListeners();
    return this.socket;
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Conectado al servidor Socket.IO');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Desconectado del servidor Socket.IO:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket.IO:', error);
      this.handleReconnection();
    });

    this.socket.on('sensor_data', (data) => {
      // Emitir evento personalizado para que los componentes puedan escuchar
      window.dispatchEvent(new CustomEvent('sensorData', { detail: data }));
    });

    this.socket.on('critical_alert', (alert) => {
      // Emitir evento personalizado para alertas críticas
      window.dispatchEvent(new CustomEvent('criticalAlert', { detail: alert }));
    });

    this.socket.on('tank_update', (data) => {
      // Emitir evento personalizado para actualizaciones de tanque
      window.dispatchEvent(new CustomEvent('tankUpdate', { detail: data }));
    });
  }

  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Intentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.socket?.connect();
      }, Math.pow(2, this.reconnectAttempts) * 1000); // Backoff exponencial
    } else {
      console.error('❌ Máximo número de intentos de reconexión alcanzado');
    }
  }

  // Métodos para interactuar con el servidor
  joinTank(tankId: string) {
    this.socket?.emit('join_tank', tankId);
  }

  leaveTank(tankId: string) {
    this.socket?.emit('leave_tank', tankId);
  }

  requestSensorData(sensorId: string) {
    this.socket?.emit('request_sensor_data', sensorId);
  }

  // Método para desconectar
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Getter para verificar si está conectado
  get isConnected() {
    return this.socket?.connected || false;
  }

  // Método para obtener la instancia del socket
  getSocket() {
    return this.socket;
  }
}

// Exportar instancia singleton
export const socketService = new SocketService();
export default socketService;