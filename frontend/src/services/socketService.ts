/**
 * @file socketService.ts
 * @description Servicio corregido para gestionar la conexión de Socket.IO con reconexión automática
 * @author Kevin Mariano & Claude AI
 * @version 2.1.0 (Connection Fix)
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { io, Socket } from 'socket.io-client';

const API_URL =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') ||
    'http://localhost:5001';

class SocketManager {
    private static instance: SocketManager;
    public socket: Socket;
    private connectionAttempts = 0;
    private maxConnectionAttempts = 5;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    private constructor() {
        this.socket = io(API_URL, {
            autoConnect: false,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            maxReconnectionAttempts: 10,
            timeout: 20000,
            forceNew: true,
            transports: ['websocket', 'polling'],
            withCredentials: true,
        });

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
        
        // Obtener el token más reciente
        const token = localStorage.getItem('accessToken');
        if (!token) {
            console.error('❌ No hay token de acceso disponible para Socket');
            return;
        }

        // Configurar la autenticación
        this.socket.auth = {
            token: `Bearer ${token}`,
        };

        // Conectar
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
            
            // Limpiar timeout de reconexión si existe
            if (this.reconnectTimeout) {
                clearTimeout(this.reconnectTimeout);
                this.reconnectTimeout = null;
            }
        });

        this.socket.on('disconnect', (reason) => {
            console.warn('🔌 Desconectado del servidor de Sockets:', reason);
            
            // Intentar reconectar si la desconexión no fue intencional
            if (reason === 'io server disconnect') {
                // El servidor desconectó el socket, reconectar manualmente
                console.log('🔄 Reconectando por desconexión del servidor...');
                this.attemptReconnect();
            } else if (reason === 'transport close' || reason === 'transport error') {
                // Error de transporte, intentar reconectar
                console.log('🔄 Reconectando por error de transporte...');
                this.attemptReconnect();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error(
                '❌ Error de conexión de Socket:',
                error.message,
            );
            
            // Si el error es de autenticación, no intentar reconectar automáticamente
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

        // Eventos específicos del negocio
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
            return; // Ya hay un intento de reconexión en progreso
        }

        const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 10000); // Backoff exponencial
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