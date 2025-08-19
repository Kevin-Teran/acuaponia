/**
 * @file socketService.ts
 * @description Servicio Singleton para gestionar la conexión WebSocket. Se encarga de conectar,
 * desconectar y manejar los listeners para eventos en tiempo real.
 */
 import { io, Socket } from 'socket.io-client';
 import { SensorData, Report } from '@/types';
 
 class SocketService {
   private socket: Socket | null = null;
   private readonly socketUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:5001';
 
   /**
    * @method connect
    * @description Inicia y gestiona la conexión con el servidor de Socket.IO.
    * Es idempotente; si ya está conectado, no hace nada.
    */
   public connect(): void {
     if (this.socket?.connected || this.socket?.connecting) {
       return;
     }
 
     console.log(`🔌 Intentando conectar al servidor de Sockets en: ${this.socketUrl}`);
     
     this.socket?.disconnect();
 
     this.socket = io(this.socketUrl, {
       transports: ['websocket'],
       reconnection: true,
       reconnectionAttempts: 5,
     });
 
     this.socket.on('connect', () => {
       console.log(`✅ Conectado al servidor Socket.IO con ID: ${this.socket!.id}`);
     });
 
     this.socket.on('disconnect', (reason: string) => {
       console.warn(`🔌 Desconectado del servidor Socket.IO: ${reason}`);
     });
     
     this.socket.on('connect_error', (err: Error) => {
       console.error(`❌ Error de conexión de Socket.IO: ${err.message}`);
     });
   }
 
   /**
    * @method disconnect
    * @description Cierra la conexión de Socket.IO de forma segura.
    */
   public disconnect(): void {
     if (this.socket) {
       this.socket.disconnect();
     }
   }
 
   public onSensorData(callback: (data: SensorData) => void): void {
     this.socket?.on('new_sensor_data', callback);
   }
 
   public offSensorData(callback: (data: SensorData) => void): void {
     this.socket?.off('new_sensor_data', callback);
   }
   
   public onReportUpdate(callback: (report: Report) => void): void {
     this.socket?.on('report_status_update', callback);
   }
 
   public offReportUpdate(callback: (report: Report) => void): void {
     this.socket?.off('report_status_update', callback);
   }
 }
 
 export const socketService = new SocketService(); 