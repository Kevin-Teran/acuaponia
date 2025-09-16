/**
 * @file events.gateway.ts
 * @route /backend/src/events
 * @description Gateway de WebSockets protegido con autenticación JWT.
 * Emite eventos a salas específicas por `userId` para sensores y reportes.
 * @author Kevin Mariano
 * @version 1.0.0
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

// Interfaces para los Payloads
interface SensorDataWithDetails extends SensorData {
  userId: string;
  sensor: { hardwareId: string };
}

interface ReportWithUser extends Report {
  userId: string;
}

@WebSocketGateway({
  cors: {
    // SOLUCIÓN: Usar un origen específico en lugar de '*' cuando credentials es true.
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  // Inyectamos los servicios necesarios para la autenticación manual
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @method handleConnection
   * @description Maneja la conexión de un nuevo cliente.
   * Realiza la autenticación del token JWT aquí mismo.
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

      this.logger.log(`🔗 Cliente conectado y autenticado: ${user.name} (${client.id})`);
      client.join(user.id);
      this.logger.log(`🚪 Cliente ${client.id} se unió a la sala: ${user.id}`);
    } catch (error) {
      this.logger.error(`Falló la autenticación del socket: ${error.message}`);
      client.disconnect(true); // Desconectar el socket si la autenticación falla
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user as User;
    if (user) {
      this.logger.log(`🔌 Cliente desconectado: ${user.name} (${client.id})`);
    } else {
      this.logger.log(`🔌 Cliente no autenticado desconectado: ${client.id}`);
    }
  }

  private extractTokenFromHandshake(client: Socket): string | undefined {
    const authHeader = client.handshake.auth.token as string;
    if (!authHeader) return undefined;
    const [type, token] = authHeader.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }


  broadcastNewData(data: SensorDataWithDetails) {
    if (data.userId) {
      this.server.to(data.userId).emit('new_sensor_data', data);
    }
  }

  broadcastReportUpdate(report: ReportWithUser) {
    if (report.userId) {
      this.server.to(report.userId).emit('report_status_update', report);
    }
  }
  /**
   * Emite un evento de nueva alerta a una lista específica de IDs de usuario (administradores).
   * @param adminIds - Un array de IDs de los usuarios administradores.
   * @param alertPayload - El objeto de la alerta que se enviará.
   */
   broadcastNewAlertToAdmins(adminIds: string[], alertPayload: any) {
    if (adminIds && adminIds.length > 0) {
      this.logger.log(`📢 Transmitiendo nueva alerta a las salas de los administradores: ${adminIds.join(', ')}`);
      // El método 'to' puede recibir un array de nombres de salas (que son nuestros user.id)
      this.server.to(adminIds).emit('new-alert', alertPayload);
    }
  }
}