/**
 * @file socketService.ts
 * @description Servicio corregido para gestionar la conexión de Socket.IO con reconexión automática
 * @author Kevin Mariano
 * @version 1.0.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */


 import { io, Socket, ManagerOptions, SocketOptions } from 'socket.io-client';
 import { Logger } from '@/utils/logger';
 
 const API_URL =
     process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') ||
     'http://localhost:5001';
 
 class SocketManager {
     public socket: Socket;
     private logger = new Logger('SocketManager');
     private static instance: SocketManager;
     private connectionAttempts = 0;
     private readonly maxConnectionAttempts = 10;
     private reconnectTimeout: NodeJS.Timeout | null = null;
   
     private constructor() {
       this.logger.log('Inicializando SocketManager...');
       const url = process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, 'ws');
       const token = localStorage.getItem('access_token');
       if (!url) {
         this.logger.error('NEXT_PUBLIC_API_URL no está definida.');
         throw new Error('URL de la API no definida');
       }
   
       const options: Partial<ManagerOptions & SocketOptions> = {
         reconnection: true,
         reconnectionDelay: 1000,
         reconnectionDelayMax: 5000,
         reconnectionAttempts: 10, 
         forceNew: true,
         transports: ['websocket', 'polling'],
         auth: {
           token: `Bearer ${token}`
         },
       };
   
       this.socket = io(url, options);
       this.setupEventListeners();
     }
     
     public static getInstance(): SocketManager {
         if (!SocketManager.instance) {
             SocketManager.instance = new SocketManager();
         }
         return SocketManager.instance;
     }
 
     /**
      * @method connect
      * @description Conecta el socket al servidor con token de autenticación
      */
     public connect() {
         if (this.socket.connected) {
             console.log('🔌 Socket ya está conectado');
             return;
         }
 
         console.log(`🔌 Conectando al Socket en ${API_URL}...`);
         
         const token = localStorage.getItem('accessToken');
         if (!token) {
             console.error('❌ No hay token de acceso disponible para Socket');
             return;
         }
 
         this.socket.auth = {
             token: `Bearer ${token}`,
         };
 
         this.socket.connect();
         this.connectionAttempts++;
     }
 
     /**
      * @method disconnect
      * @description Desconecta el socket del servidor
      */
     public disconnect() {
         if (this.reconnectTimeout) {
             clearTimeout(this.reconnectTimeout);
             this.reconnectTimeout = null;
         }
 
         if (this.socket.connected) {
             console.log('🔌 Desconectando del servidor de Sockets...');
             this.socket.disconnect();
         }
         
         this.connectionAttempts = 0;
     }
 
     /**
      * @method updateToken
      * @description Actualiza el token de autenticación y reconecta si es necesario
      */
     public updateToken(newToken: string) {
         const wasConnected = this.socket.connected;
         
         if (wasConnected) {
             this.socket.disconnect();
         }
 
         this.socket.auth = {
             token: `Bearer ${newToken}`,
         };
 
         if (wasConnected) {
             this.socket.connect();
         }
     }
 
     private setupEventListeners() {
         this.socket.on('connect', () => {
             console.log(
                 '✅ Conectado al servidor de Sockets con ID:',
                 this.socket.id,
             );
             this.connectionAttempts = 0;
             
             if (this.reconnectTimeout) {
                 clearTimeout(this.reconnectTimeout);
                 this.reconnectTimeout = null;
             }
         });
 
         this.socket.on('disconnect', (reason) => {
             console.warn('🔌 Desconectado del servidor de Sockets:', reason);
             
             if (reason === 'io server disconnect') {
                 console.log('🔄 Reconectando por desconexión del servidor...');
                 this.attemptReconnect();
             } else if (reason === 'transport close' || reason === 'transport error') {
                 console.log('🔄 Reconectando por error de transporte...');
                 this.attemptReconnect();
             }
         });
 
         this.socket.on('connect_error', (error) => {
             console.error(
                 '❌ Error de conexión de Socket:',
                 error.message,
             );
             
             if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
                 console.error('❌ Error de autenticación. Verifica tu token.');
                 return;
             }
 
             this.attemptReconnect();
         });
 
         this.socket.on('reconnect', (attemptNumber) => {
             console.log(`✅ Reconectado al socket después de ${attemptNumber} intentos`);
         });
 
         this.socket.on('reconnect_error', (error) => {
             console.error('❌ Error al reconectar:', error.message);
         });
 
         this.socket.on('reconnect_failed', () => {
             console.error('❌ Falló la reconexión después de todos los intentos');
         });
 
         this.socket.on('new_sensor_data', (data) => {
             console.log('📊 Datos de sensor recibidos:', data);
         });
 
         this.socket.on('new-alert', (data) => {
             console.log('🚨 Alerta recibida:', data);
         });
 
         this.socket.on('report_status_update', (data) => {
             console.log('📋 Actualización de reporte:', data);
         });
     }
 
     private attemptReconnect() {
         if (this.connectionAttempts >= this.maxConnectionAttempts) {
             console.error(`❌ Máximo número de intentos de conexión alcanzado (${this.maxConnectionAttempts})`);
             return;
         }
 
         if (this.reconnectTimeout) {
             return; 
         }
 
         const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 10000); 
         console.log(`🔄 Intentando reconectar en ${delay}ms... (Intento ${this.connectionAttempts + 1}/${this.maxConnectionAttempts})`);
 
         this.reconnectTimeout = setTimeout(() => {
             this.reconnectTimeout = null;
             const token = localStorage.getItem('accessToken');
             
             if (token) {
                 this.socket.auth = {
                     token: `Bearer ${token}`,
                 };
                 this.socket.connect();
                 this.connectionAttempts++;
             } else {
                 console.error('❌ No se puede reconectar: token no disponible');
             }
         }, delay);
     }
 
     /**
      * @method isConnected
      * @description Verifica si el socket está conectado
      */
     public isConnected(): boolean {
         return this.socket.connected;
     }
 
     /**
      * @method getConnectionState
      * @description Obtiene información del estado de conexión
      */
     public getConnectionState() {
         return {
             connected: this.socket.connected,
             id: this.socket.id,
             attempts: this.connectionAttempts,
             transport: this.socket.io.engine?.transport?.name,
         };
     }
 }
 
 export const socketManager = SocketManager.getInstance();
 export const socket = socketManager.socket;