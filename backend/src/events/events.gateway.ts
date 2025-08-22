import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SensorData, Report } from '@prisma/client';

/**
 * @gateway EventsGateway
 * @description Gestiona las conexiones WebSocket y la emisión de eventos en tiempo real a los clientes.
 */
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  /**
   * @method broadcastNewData
   * @description Envía nuevos datos de sensor a todos los clientes conectados.
   * @param {SensorData & { sensor: { hardwareId: string } }} data - El dato del sensor.
   */
  broadcastNewData(data: SensorData & { sensor: { hardwareId: string } }) {
    this.server.emit('new_sensor_data', {
        hardwareId: data.sensor.hardwareId,
        value: data.value,
        timestamp: data.timestamp,
        type: data.type,
        tankId: data.tankId, 
        sensorId: data.sensorId,
    });
  }

  /**
   * @method broadcastReportUpdate
   * @description Notifica a todos los clientes sobre una actualización en el estado de un reporte.
   * @param {Report} report - El reporte actualizado.
   */
  broadcastReportUpdate(report: Report) {
    this.server.emit('report_status_update', report);
  }
}