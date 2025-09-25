/**
 * @file socketService.ts
 * @route frontend/src/services
 * @description Servicio corregido para gestionar la conexión de Socket.IO con reconexión automática
 * @author Kevin Mariano
 * @version 1.0.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { io, Socket } from 'socket.io-client';
import { DefaultEventsMap } from '@socket.io/client-events';
import { ManagerOptions, SocketOptions } from 'socket.io-client/build/esm/types';
import { Logger } from '@/utils/logger';

class SocketManager {
    public socket: Socket<DefaultEventsMap, DefaultEventsMap>;
    private logger = new Logger('SocketManager');
    private static instance: SocketManager;
    private connectionAttempts = 0;
    private readonly MAX_ATTEMPTS = 10;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    private constructor() {
        this.logger.log('Inicializando SocketManager...');
        const url = process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, 'ws');
        
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

        if (!url) {
            this.logger.error('NEXT_PUBLIC_API_URL no está definida.');
            throw new Error('URL de la API no definida');
        }

        const options: Partial<ManagerOptions & SocketOptions> = {
            extraHeaders: token ? { Authorization: `Bearer ${token}` } : {},
            reconnectionAttempts: this.MAX_ATTEMPTS,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            forceNew: true,
            transports: ['websocket', 'polling'],
            auth: {
                token: token,
            },
        };

        this.socket = io(url, options);
        this.registerEventListeners();
    }

    public static getInstance(): SocketManager | null {
        if (typeof window === 'undefined') {
            return null;
        }
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager();
        }
        return SocketManager.instance;
    }

    public getSocket(): Socket {
        return this.socket;
    }

    public init(): void {
      this.logger.log('Iniciando conexión de socket...');
      if (!this.socket.connected) {
          this.socket.connect();
      }
    }
  
    public close(): void {
      this.logger.log('Cerrando conexión de socket...');
      if (this.socket.connected) {
          this.socket.disconnect();
      }
    }

    private registerEventListeners(): void {
        this.socket.on('connect', () => {
            this.logger.log('✅ Conexión de socket exitosa.');
            this.connectionAttempts = 0;
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
        });

        this.socket.on('disconnect', (reason) => {
            this.logger.warn(`🔴 Desconexión de socket: ${reason}`);
            this.startReconnectionProcess();
        });

        this.socket.on('connect_error', (error) => {
            console.error(
                '❌ Error de conexión de Socket:',
                error.message,
            );
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
                this.socket.auth = {
                    token: token
                };
                this.socket.connect();
            } else {
                this.logger.error('❌ No se puede reconectar: token no disponible');
                this.socket.disconnect();
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
export const socket = socketManager ? socketManager.socket : null;