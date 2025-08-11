import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SensorData } from '@prisma/client';

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
   * @description Envía nuevos datos de sensor a todos los clientes conectados.
   * @param data Los datos del sensor que se van a emitir.
   */
  broadcastNewData(data: SensorData & { sensor: { hardwareId: string } }) {
    this.server.emit('new_sensor_data', {
        hardwareId: data.sensor.hardwareId,
        value: data.value,
        timestamp: data.timestamp,
    });
  }
}