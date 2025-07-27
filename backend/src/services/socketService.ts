import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

class SocketService {
  private io: SocketIOServer | null = null;
  private connectedClients = new Map<string, Socket>();

  initialize(io: SocketIOServer): void {
    this.io = io;

    // Middleware de autenticación para Socket.IO
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
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

        socket.data.user = user;
        next();
      } catch (error) {
        logger.error('❌ Error en autenticación Socket.IO:', error);
        next(new Error('Token inválido'));
      }
    });

    io.on('connection', (socket) => {
      const user = socket.data.user;
      logger.info(`✅ Cliente conectado via Socket.IO: ${user.email} (${socket.id})`);
      
      this.connectedClients.set(socket.id, socket);

      // Unirse a salas basadas en rol
      if (user.role === 'ADMIN') {
        socket.join('admins');
      }
      socket.join('users');
      socket.join(`user_${user.id}`);

      // Eventos del cliente
      socket.on('subscribe_sensor_data', (sensorIds: string[]) => {
        sensorIds.forEach(sensorId => {
          socket.join(`sensor_${sensorId}`);
        });
        logger.debug(`📡 Cliente ${user.email} suscrito a sensores: ${sensorIds.join(', ')}`);
      });

      socket.on('unsubscribe_sensor_data', (sensorIds: string[]) => {
        sensorIds.forEach(sensorId => {
          socket.leave(`sensor_${sensorId}`);
        });
        logger.debug(`📡 Cliente ${user.email} desuscrito de sensores: ${sensorIds.join(', ')}`);
      });

      socket.on('request_sensor_status', async () => {
        try {
          const sensors = await prisma.sensor.findMany({
            select: {
              id: true,
              name: true,
              status: true,
              batteryLevel: true,
              lastUpdate: true
            }
          });
          
          socket.emit('sensor_status_update', sensors);
        } catch (error) {
          logger.error('❌ Error obteniendo estado de sensores:', error);
          socket.emit('error', { message: 'Error obteniendo estado de sensores' });
        }
      });

      socket.on('disconnect', (reason) => {
        logger.info(`❌ Cliente desconectado: ${user.email} (${socket.id}) - Razón: ${reason}`);
        this.connectedClients.delete(socket.id);
      });

      socket.on('error', (error) => {
        logger.error(`❌ Error en socket ${socket.id}:`, error);
      });

      // Enviar estado inicial
      this.sendInitialData(socket);
    });

    logger.info('✅ Socket.IO inicializado correctamente');
  }

  private async sendInitialData(socket: Socket): Promise<void> {
    try {
      const user = socket.data.user;

      // Enviar datos iniciales según el rol del usuario
      if (user.role === 'ADMIN') {
        // Los admins pueden ver todos los datos
        const recentData = await prisma.sensorData.findMany({
          take: 50,
          orderBy: { timestamp: 'desc' },
          include: {
            sensor: {
              select: { id: true, name: true, type: true }
            }
          }
        });

        socket.emit('initial_data', {
          sensorData: recentData,
          userRole: user.role
        });
      } else {
        // Los usuarios regulares solo ven datos de sus tanques
        const userTanks = await prisma.tank.findMany({
          where: { userId: user.id },
          include: {
            sensors: {
              include: {
                sensorData: {
                  take: 20,
                  orderBy: { timestamp: 'desc' }
                }
              }
            }
          }
        });

        socket.emit('initial_data', {
          tanks: userTanks,
          userRole: user.role
        });
      }
    } catch (error) {
      logger.error('❌ Error enviando datos iniciales:', error);
      socket.emit('error', { message: 'Error cargando datos iniciales' });
    }
  }

  // Métodos para emitir eventos
  public emitSensorData(data: any): void {
    if (!this.io) return;

    // Emitir a todos los clientes suscritos al sensor específico
    this.io.to(`sensor_${data.sensorId}`).emit('sensor_data', data);
    
    // También emitir a todos los usuarios para el dashboard general
    this.io.to('users').emit('sensor_data_update', data);
    
    logger.debug(`📡 Datos de sensor emitidos: ${data.sensorId}`);
  }

  public emitSensorStatus(sensorId: string, status: any): void {
    if (!this.io) return;

    this.io.to(`sensor_${sensorId}`).emit('sensor_status', {
      sensorId,
      ...status
    });

    this.io.to('users').emit('sensor_status_update', {
      sensorId,
      ...status
    });

    logger.debug(`📡 Estado de sensor emitido: ${sensorId}`);
  }

  public emitAlert(alert: any): void {
    if (!this.io) return;

    // Emitir alertas críticas a todos los usuarios
    if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
      this.io.to('users').emit('critical_alert', alert);
    }

    // Emitir todas las alertas a los administradores
    this.io.to('admins').emit('alert', alert);

    logger.info(`🚨 Alerta emitida: ${alert.type} - ${alert.severity}`);
  }

  public emitSystemStatus(status: any): void {
    if (!this.io) return;

    this.io.to('admins').emit('system_status', status);
    logger.debug('📡 Estado del sistema emitido');
  }

  public emitToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.to(`user_${userId}`).emit(event, data);
    logger.debug(`📡 Evento ${event} emitido al usuario ${userId}`);
  }

  public emitToAdmins(event: string, data: any): void {
    if (!this.io) return;

    this.io.to('admins').emit(event, data);
    logger.debug(`📡 Evento ${event} emitido a administradores`);
  }

  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  public getConnectedClients(): string[] {
    return Array.from(this.connectedClients.keys());
  }
}

export const socketService = new SocketService();

export function initializeSocket(io: SocketIOServer): void {
  socketService.initialize(io);
}

export default socketService;