import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { SensorData } from '@prisma/client';

/**
 * @class SocketService
 * @desc Gestiona todas las conexiones y la comunicación en tiempo real a través de WebSockets.
 */
class SocketService {
  private io: SocketIOServer | null = null;

  /**
   * @desc Inicializa el servidor de Socket.IO, incluyendo el middleware de autenticación.
   * @param {SocketIOServer} io - La instancia del servidor de Socket.IO.
   */
  public initialize(io: SocketIOServer): void {
    this.io = io;

    // Middleware para autenticar cada conexión de socket
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Token de autenticación requerido'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, name: true, role: true, status: true }
        });

        if (!user || user.status !== 'ACTIVE') {
          return next(new Error('Usuario no válido o inactivo'));
        }

        // @ts-ignore
        socket.user = user; // Adjuntar usuario al objeto socket
        next();
      } catch (error) {
        logger.error('❌ Error en autenticación Socket.IO:', error);
        next(new Error('Token inválido'));
      }
    });

    io.on('connection', (socket: Socket) => {
      // @ts-ignore
      const user = socket.user;
      logger.info(`Cliente conectado via Socket.IO: ${user.email} (${socket.id})`);

      // Unir al usuario a salas específicas para notificaciones dirigidas
      if (user.role === 'ADMIN') socket.join('admins');
      socket.join(`user_${user.id}`);

      socket.on('disconnect', (reason) => {
        logger.info(`Cliente desconectado: ${user.email} (${socket.id}) - Razón: ${reason}`);
      });
    });

    logger.info('Servicio de Socket.IO inicializado.');
  }

  /**
   * @desc Emite un evento de nuevos datos de sensor a las salas correspondientes.
   * @param {SensorData & { tank: any }} data - El objeto de datos del sensor.
   */
  public emitSensorData(data: SensorData & { tank?: any }): void {
    if (!this.io) return;
    // Envía los datos a todos los clientes conectados. En una app más compleja,
    // se podría enviar solo a los usuarios que tengan acceso a ese tanque.
    this.io.emit('new_sensor_data', data);
  }

  /**
   * @desc Emite una nueva alerta a los administradores y/o al usuario específico.
   * @param {any} alert - El objeto de la alerta.
   */
  public emitAlert(alert: any): void {
    if (!this.io) return;
    // Notificar al usuario dueño del tanque si está definido
    if (alert.userId) {
      this.io.to(`user_${alert.userId}`).emit('new_alert', alert);
    }
    // Notificar siempre a los administradores para alertas importantes
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
        this.io.to('admins').emit('new_alert', alert);
    }
    logger.info(`🚨 Alerta emitida vía Socket: ${alert.type} - ${alert.severity}`);
  }
}

export const socketService = new SocketService();
