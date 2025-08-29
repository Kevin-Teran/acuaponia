/**
 * @file events.gateway.ts
 * @description Gateway de WebSockets para comunicación en tiempo real.
 * Emite eventos a salas específicas por `userId` para sensores y reportes.
 * @author Kevin Mariano (Actualizado por Gemini)
 * @version 3.0.0
 * @since 1.0.0
 */
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SensorData, Report } from '@prisma/client';

// --- Interfaces para los Payloads de los Eventos ---

// Datos del sensor que se enviarán al frontend
interface SensorDataWithDetails extends SensorData {
  userId: string; // ID del usuario para dirigir el mensaje a la sala correcta
  sensor: {
    hardwareId: string;
  };
}

// Datos del reporte que se enviarán al frontend
interface ReportWithUser extends Report {
  userId: string; // ID del usuario para dirigir el mensaje
}


@WebSocketGateway({
  cors: {
    origin: '*', // En producción, deberías restringir esto a tu dominio del frontend
  },
  transports: ['websocket', 'polling'], // Añadir polling como fallback
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`🔗 Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() userId: string, @ConnectedSocket() client: Socket): void {
    if (userId) {
      client.join(userId);
      this.logger.log(`🚪 Cliente ${client.id} se unió a la sala del usuario: ${userId}`);
    }
  }

  /**
   * @description Emite una actualización de datos de sensor al topic 'new_sensor_data'
   * en la sala del usuario propietario.
   * @param data Los datos del sensor, incluyendo el userId.
   */
  broadcastNewData(data: SensorDataWithDetails) {
    if (data.userId) {
      this.server.to(data.userId).emit('new_sensor_data', data);
    } else {
      this.logger.warn(`No se encontró userId para el sensor ${data.sensor.hardwareId}, no se puede emitir evento.`);
    }
  }

  /**
   * @description Emite una actualización del estado de un reporte al topic 'report_status_update'
   * en la sala del usuario propietario.
   * @param report El reporte actualizado, incluyendo el userId.
   */
  broadcastReportUpdate(report: ReportWithUser) {
    if (report.userId) {
      this.server.to(report.userId).emit('report_status_update', report);
    } else {
        this.logger.warn(`No se encontró userId para el reporte ${report.id}, no se puede emitir evento.`);
    }
  }
}