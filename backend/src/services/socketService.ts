import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { SensorData } from '@prisma/client';

// Se elimina la declaración global de 'user' de aquí, ya que ahora vive en el archivo de tipos.

/**
 * @class SocketService
 * @desc Gestiona todas las conexiones y la comunicación en tiempo real a través de WebSockets.
 */
class SocketService {
  private io: SocketIOServer | null = null;

  /**
   * @desc Inicializa el servidor de Socket.IO, incluyendo el middleware de autenticación y los manejadores de eventos.
   * @param {SocketIOServer} io - La instancia del servidor de Socket.IO.
   */
  public initialize(io: SocketIOServer): void {
    this.io = io;

    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        if (!token) {
          return next(new Error('Token de autenticación requerido'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        // Seleccionamos los campos necesarios, consistentes con la definición global
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, name: true, role: true, status: true }
        });

        if (!user || user.status !== 'ACTIVE') {
          return next(new Error('Usuario no válido o inactivo'));
        }

        socket.data.user = user;
        next();
      } catch (error) {
        logger.error('❌ Error en autenticación Socket.IO:', error);
        next(new Error('Token inválido'));
      }
    });

    io.on('connection', (socket: Socket) => {
      const user = socket.data.user;
      logger.info(`Cliente conectado via Socket.IO: ${user.email} (${socket.id})`);

      if (user.role === 'ADMIN') socket.join('admins');
      socket.join(`user_${user.id}`);

      socket.on('disconnect', (reason) => {
        logger.info(`Cliente desconectado: ${user.email} (${socket.id}) - Razón: ${reason}`);
      });

      socket.on('error', (error) => {
        logger.error(`Error en socket ${socket.id}:`, error);
      });
    });

    logger.info('Servicio de Socket.IO inicializado.');
  }

  /**
   * @desc Emite un evento de nuevos datos de sensor a las salas correspondientes.
   * @param {SensorData & { tank: any }} data - El objeto de datos del sensor recién creado.
   */
  public emitSensorData(data: SensorData & { tank: any }): void {
    if (!this.io) return;
    const tankRoom = `tank_${data.tankId}`;
    this.io.to(tankRoom).emit('new_sensor_data', data);
  }

  /**
   * @desc Emite una nueva alerta a las salas correspondientes.
   * @param {any} alert - El objeto de la alerta.
   */
  public emitAlert(alert: any): void {
    if (!this.io) return;
    if (alert.userId) {
      this.io.to(`user_${alert.userId}`).emit('new_alert', alert);
    }
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
        this.io.to('admins').emit('new_alert', alert);
    }
    logger.info(`🚨 Alerta emitida: ${alert.type} - ${alert.severity}`);
  }
}

export const socketService = new SocketService();

/**
 * @desc Función de conveniencia para inicializar el servicio en el archivo principal del servidor.
 */
export function initializeSocket(io: SocketIOServer): void {
  socketService.initialize(io);
}