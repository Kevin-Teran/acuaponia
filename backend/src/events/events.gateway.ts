import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SensorData } from '@prisma/client';

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
   * @description Envía nuevos datos de sensor a todos los clientes conectados a través del evento 'new_sensor_data'.
   * @param {SensorData & { sensor: { hardwareId: string } }} data - El objeto completo del dato del sensor recién creado.
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
}