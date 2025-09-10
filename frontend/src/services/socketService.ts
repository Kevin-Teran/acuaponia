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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * @class SocketManager
 * @description Clase singleton para gestionar la instancia del socket.
 * Esto asegura que solo haya una conexión y que el objeto `socket`
 * esté disponible inmediatamente al ser importado, previniendo errores de `undefined`.
 */
class SocketManager {
	private static instance: SocketManager;
	public socket: Socket;

	// El constructor es privado para forzar el uso del método `getInstance`
	private constructor() {
		console.log('🔌 Inicializando conexión de Socket...');
		this.socket = io(API_URL, {
			reconnectionAttempts: 5,
			transports: ['websocket', 'polling'],
			// `autoConnect` es true por defecto, por lo que se conectará al ser instanciado.
		});

		this.setupEventListeners();
	}

	/**
	 * @method getInstance
	 * @description Obtiene la instancia única del SocketManager.
	 * @returns {SocketManager}
	 */
	public static getInstance(): SocketManager {
		if (!SocketManager.instance) {
			SocketManager.instance = new SocketManager();
		}
		return SocketManager.instance;
	}

	private setupEventListeners() {
		this.socket.on('connect', () => {
			console.log('✅ Conectado al servidor de Sockets con ID:', this.socket.id);
		});

		this.socket.on('disconnect', (reason) => {
			console.warn('🔌 Desconectado del servidor de Sockets:', reason);
		});

		this.socket.on('connect_error', (error) => {
			console.error(
				'❌ Error de conexión de Socket:',
				error.message,
				error.cause,
			);
		});
	}
}

// Exporta la instancia del socket directamente.
// Esto garantiza que cualquier archivo que importe `socket` reciba el objeto ya inicializado.
export const socket = SocketManager.getInstance().socket;

