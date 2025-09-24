/**
 * @file events.gateway.ts
 * @route /backend/src/events
 * @description Gateway de WebSockets completo y corregido con tipos apropiados.
 * @author Kevin Mariano
 * @version 1.1.1 (Types Fix)
 * @since 1.0.0
 * @copyright SENA 2025
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SensorData, Report, User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

// Interfaces más flexibles para los Payloads
interface SensorDataPayload {
  id: string;
  value: number;
  timestamp: string | Date;
  userId: string;
  sensor: {
    id: string;
    name: string;
    type: string;
    hardwareId: string;
    tank: {
      id: string;
      name: string;
      userId: string;
    };
  };
}

interface ReportWithUser extends Report {
  userId: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);
  private connectedClients = new Map<string, { userId: string; userName: string }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @method handleConnection
   * @description Maneja la conexión de un nuevo cliente con autenticación JWT.
   */
  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromHandshake(client);
      if (!token) {
        throw new Error('No se proporcionó token de autenticación.');
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new Error('El usuario del token no fue encontrado.');
      }

      // Adjuntamos el usuario al socket para uso futuro
      client.data.user = user;

      // Guardar información del cliente conectado
      this.connectedClients.set(client.id, {
        userId: user.id,
        userName: user.name,
      });

      this.logger.log(`🔗 Cliente conectado y autenticado: ${user.name} (${client.id})`);
      
      // Unir el cliente a su sala personal (basada en userId)
      client.join(user.id);
      this.logger.log(`🚪 Cliente ${client.id} se unió a la sala: ${user.id}`);

      // Si es admin, también unirlo a la sala de admins
      if (user.role === 'ADMIN') {
        client.join('admin_room');
        this.logger.log(`👑 Admin ${user.name} unido a la sala de administradores`);
      }

      // Enviar confirmación de conexión exitosa
      client.emit('connection_established', {
        message: 'Conectado exitosamente',
        userId: user.id,
        userName: user.name,
        timestamp: new Date().toISOString(),
      });

      // Log del estado actual de conexiones
      this.logger.log(`📊 Total de clientes conectados: ${this.connectedClients.size}`);

    } catch (error) {
      this.logger.error(`❌ Falló la autenticación del socket: ${error.message}`);
      client.emit('connection_error', { 
        error: 'Error de autenticación',
        message: error.message 
      });
      client.disconnect(true);
    }
  }

  /**
   * @method handleDisconnect
   * @description Maneja la desconexión de un cliente.
   */
  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    
    if (clientInfo) {
      this.logger.log(`🔌 Cliente desconectado: ${clientInfo.userName} (${client.id})`);
      this.connectedClients.delete(client.id);
    } else {
      this.logger.log(`🔌 Cliente no identificado desconectado: ${client.id}`);
    }

    this.logger.log(`📊 Total de clientes conectados: ${this.connectedClients.size}`);
  }

  /**
   * @method extractTokenFromHandshake
   * @description Extrae el token JWT del handshake del socket.
   */
  private extractTokenFromHandshake(client: Socket): string | undefined {
    const authHeader = client.handshake.auth.token as string;
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  /**
   * @method broadcastNewData
   * @description Alias para mantener compatibilidad con el código existente
   * SOLUCIÓN: Mantener el método original que tu servicio está llamando
   */
  public broadcastNewData(data: any) {
    this.logger.log('📊 broadcastNewData llamado - redirigiendo a broadcastNewSensorData');
    this.broadcastNewSensorData(data);
  }

  /**
   * @method broadcastNewSensorData
   * @description Emite nuevos datos de sensores a usuarios específicos.
   * Este es el método principal que debes llamar desde tu servicio de sensores.
   */
  public broadcastNewSensorData(sensorData: SensorDataPayload | any) {
    const userId = sensorData.userId || sensorData.sensor?.tank?.userId;
    
    if (!userId) {
      this.logger.warn('❌ No se puede emitir datos de sensor: falta userId');
      return;
    }

    // Formatear los datos para el frontend
    const formattedData = {
      id: sensorData.id,
      value: sensorData.value,
      timestamp: sensorData.timestamp instanceof Date 
        ? sensorData.timestamp.toISOString() 
        : sensorData.timestamp,
      sensor: {
        id: sensorData.sensor.id,
        name: sensorData.sensor.name,
        type: sensorData.sensor.type,
        hardwareId: sensorData.sensor.hardwareId,
        tank: {
          id: sensorData.sensor.tank.id,
          name: sensorData.sensor.tank.name,
        }
      },
    };

    this.logger.log(`📊 Enviando datos de sensor a usuario ${userId}: ${sensorData.sensor.type} = ${sensorData.value}`);
    
    // Emitir a la sala del usuario específico
    this.server.to(userId).emit('new_sensor_data', formattedData);

    // También emitir a administradores
    this.server.to('admin_room').emit('new_sensor_data', {
      ...formattedData,
      userId: userId, // Incluir userId para que admins sepan de qué usuario son los datos
    });
  }

  /**
   * @method broadcastReportUpdate
   * @description Emite actualizaciones de reportes.
   */
  public broadcastReportUpdate(report: ReportWithUser) {
    if (!report.userId) {
      this.logger.warn('❌ No se puede emitir actualización de reporte: falta userId');
      return;
    }

    this.logger.log(`📋 Enviando actualización de reporte a usuario ${report.userId}`);
    this.server.to(report.userId).emit('report_status_update', report);
    
    // También a admins
    this.server.to('admin_room').emit('report_status_update', report);
  }

  /**
   * @method broadcastNewAlertToAdmins
   * @description Emite una nueva alerta a los administradores.
   */
  public broadcastNewAlertToAdmins(adminIds: string[], alertPayload: any) {
    if (!adminIds || adminIds.length === 0) {
      this.logger.warn('❌ No se puede emitir alerta: no hay IDs de administradores');
      return;
    }

    this.logger.log(`🚨 Transmitiendo nueva alerta a administradores: ${adminIds.join(', ')}`);
    
    // Emitir a las salas de administradores específicos
    adminIds.forEach(adminId => {
      this.server.to(adminId).emit('new-alert', alertPayload);
    });
    
    // También emitir a la sala general de admins
    this.server.to('admin_room').emit('new-alert', alertPayload);
  }

  /**
   * @method broadcastToAll
   * @description Emite un mensaje a todos los clientes conectados.
   */
  public broadcastToAll(event: string, data: any) {
    this.logger.log(`📢 Transmitiendo '${event}' a todos los clientes conectados`);
    this.server.emit(event, data);
  }

  // ==================== MÉTODOS DE PRUEBA Y MANTENIMIENTO ====================

  /**
   * @SubscribeMessage test_broadcast
   * @description Método de prueba para verificar que los WebSockets funcionan correctamente.
   */
  @SubscribeMessage('test_broadcast')
  handleTestBroadcast(client: Socket, data: any) {
    const user = client.data.user;
    if (!user) {
      return { error: 'Usuario no autenticado' };
    }

    // SOLUCIÓN: Usar un objeto simple que coincida con SensorDataPayload
    const testSensorData = {
      id: 'test-' + Date.now(),
      value: Math.round((Math.random() * 30 + 20) * 100) / 100, // Temperatura entre 20-50°C
      timestamp: new Date().toISOString(),
      userId: user.id,
      sensor: {
        id: 'test-sensor-' + Math.floor(Math.random() * 3 + 1),
        name: 'Sensor de Prueba',
        type: ['TEMPERATURE', 'PH', 'OXYGEN'][Math.floor(Math.random() * 3)],
        hardwareId: 'TEST' + String(Math.floor(Math.random() * 999)).padStart(3, '0'),
        tank: {
          id: 'test-tank-1',
          name: 'Tanque de Prueba',
          userId: user.id,
        }
      }
    };

    this.logger.log(`🧪 Enviando datos de prueba a ${user.name} (${user.id})`);
    this.broadcastNewSensorData(testSensorData);

    return { 
      success: true, 
      message: 'Datos de prueba enviados',
      data: testSensorData
    };
  }

  /**
   * @SubscribeMessage get_connection_info
   * @description Obtiene información sobre la conexión actual.
   */
  @SubscribeMessage('get_connection_info')
  handleGetConnectionInfo(client: Socket) {
    const user = client.data.user;
    const clientInfo = this.connectedClients.get(client.id);

    return {
      socketId: client.id,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
      connectedAt: clientInfo ? 'Connected' : 'Unknown',
      totalConnections: this.connectedClients.size,
      rooms: Array.from(client.rooms),
    };
  }

  /**
   * @method getConnectedClientsCount
   * @description Obtiene el número de clientes conectados.
   */
  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * @method getConnectedUsers
   * @description Obtiene una lista de usuarios conectados.
   */
  public getConnectedUsers(): Array<{ userId: string; userName: string; socketId: string }> {
    const users: Array<{ userId: string; userName: string; socketId: string }> = [];
    
    this.connectedClients.forEach((clientInfo, socketId) => {
      users.push({
        userId: clientInfo.userId,
        userName: clientInfo.userName,
        socketId: socketId,
      });
    });

    return users;
  }

  /**
   * @method isUserConnected
   * @description Verifica si un usuario específico está conectado.
   */
  public isUserConnected(userId: string): boolean {
    for (const [, clientInfo] of this.connectedClients) {
      if (clientInfo.userId === userId) {
        return true;
      }
    }
    return false;
  }
}