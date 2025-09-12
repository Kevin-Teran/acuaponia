/**
 * @file socketService.ts
 * @description Servicio para gestionar la conexión de Socket.IO.
 * SOLUCIÓN: Se inicializa el socket como un singleton para garantizar que nunca sea `undefined`.
 * @author Kevin Mariano & Gemini AI
 * @version 2.0.0 (Singleton Fix)
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

    private constructor() {
        this.socket = io(API_URL, {
            // SOLUCIÓN CLAVE: Deshabilitar la conexión automática.
            // La conexión se iniciará manualmente desde AuthContext.
            autoConnect: false,
            reconnectionAttempts: 5,
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
     * @description Conecta el socket al servidor, adjuntando el token de autenticación.
     */
    public connect() {
        // Evita reconectar si ya está conectado.
        if (this.socket.connected) {
            return;
        }

        console.log(`🔌 Intentando conectar al Socket en ${API_URL}...`);
        // Asegura que el token más reciente se use para la conexión.
        const token = localStorage.getItem('accessToken');
        this.socket.auth = {
            token: token ? `Bearer ${token}` : undefined,
        };
        this.socket.connect();
    }

    /**
     * @method disconnect
     * @description Desconecta el socket del servidor.
     */
    public disconnect() {
        if (this.socket.connected) {
            console.log('🔌 Desconectando del servidor de Sockets...');
            this.socket.disconnect();
        }
    }

    private setupEventListeners() {
        this.socket.on('connect', () => {
            console.log(
                '✅ Conectado y autenticado al servidor de Sockets con ID:',
                this.socket.id,
            );
        });

        this.socket.on('disconnect', (reason) => {
            console.warn('🔌 Desconectado del servidor de Sockets:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error(
                '❌ Error de conexión de Socket:',
                error.message,
                (error as any).data,
            );
        });
    }
}

export const socketManager = SocketManager.getInstance();
export const socket = socketManager.socket;