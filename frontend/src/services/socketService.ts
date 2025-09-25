/**
 * @file socketService.ts
 * @route frontend/src/services
 * @description Servicio para gestionar la conexión de Socket.IO con reconexión automática y tipado correcto.
 * @author Kevin Mariano
 * @version 1.1.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { io, Socket, ManagerOptions, SocketOptions } from 'socket.io-client';
import { Logger } from '@/utils/logger';

class SocketManager {
    public socket: Socket<any, any> | null = null;
    private logger = new Logger('SocketManager');
    private static instance: SocketManager;
    private connectionAttempts = 0;
    private readonly MAX_ATTEMPTS = 10;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    private constructor() {
        this.logger.log('Inicializando SocketManager...');
    }

    public static getInstance(): SocketManager {
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager();
        }
        return SocketManager.instance;
    }

    public getSocket(): Socket | null {
        return this.socket;
    }

    public connect(token: string | null): void {
        this.logger.log('Iniciando conexión de socket...');
        if (!token) {
            this.logger.error('❌ No se puede conectar: token no disponible');
            return;
        }

        const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiBaseUrl) {
            this.logger.error('❌ NEXT_PUBLIC_API_URL no está definida.');
            throw new Error('URL de la API no definida');
        }

        const url = apiBaseUrl.startsWith('https://') ?
            apiBaseUrl.replace(/^https/, 'wss') :
            apiBaseUrl.replace(/^http/, 'ws');
        
        const options: Partial<ManagerOptions & SocketOptions> = {
            extraHeaders: { Authorization: `Bearer ${token}` },
            reconnectionAttempts: this.MAX_ATTEMPTS,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            forceNew: true,
            transports: ['websocket', 'polling'],
            auth: {
                token: `Bearer ${token}`,
            },
        };

        if (this.socket && this.socket.connected) {
            this.logger.warn('El socket ya está conectado. Desconectando para reconectar con el nuevo token.');
            this.socket.disconnect();
        }

        this.logger.log(`🔗 Intentando conectar a: ${url}`);
        this.socket = io(url, options);
        this.registerEventListeners();
    }
  
    public close(): void {
        this.logger.log('Cerrando conexión de socket...');
        if (this.socket && this.socket.connected) {
            this.socket.disconnect();
            this.socket = null; 
        }
    }

    private registerEventListeners(): void {
        if (!this.socket) return;
        
        this.socket.on('connect', () => {
            this.logger.log('✅ Socket conectado.');
            this.connectionAttempts = 0; 
        });
        
        this.socket.on('connect_error', (error) => {
            this.logger.error('❌ Error de conexión de Socket:', error);
            if (error.message === 'Invalid token') {
                this.logger.error('Token de autenticación inválido o expirado. Se cerrará la conexión.');
                this.close(); 
            } else {
                this.logger.error('Fallo en la conexión. Posible problema de CORS o servidor no disponible.');
            }
        });

        this.socket.on('disconnect', (reason) => {
            this.logger.warn(`🔴 Desconexión de socket: ${reason}`);
            if (reason === 'transport close') { 
                this.startReconnectionProcess();
            }
        });
    }

    private startReconnectionProcess(): void {
        if (this.reconnectTimeout) return;
        
        const attempt = this.connectionAttempts + 1;
        if (attempt > this.MAX_ATTEMPTS) {
            this.logger.error(`❌ Reconexión fallida después de ${this.MAX_ATTEMPTS} intentos.`);
            return;
        }

        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        this.logger.warn(`🔄 Intentando reconectar en ${delay / 1000}s... (Intento ${attempt}/${this.MAX_ATTEMPTS})`);
        
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            
            const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
            
            if (token) {
                this.connect(token);
                this.connectionAttempts++;
            } else {
                this.logger.error('❌ No se puede reconectar: token no disponible');
                this.socket?.disconnect();
            }
        }, delay);
    }

    public reconnect(): void {
        this.logger.log('Iniciando reconexión manual...');
        this.connectionAttempts = 0;
        this.startReconnectionProcess();
    }
}

export const socketManager = SocketManager.getInstance();
export const socket = socketManager ? socketManager.getSocket() : null;