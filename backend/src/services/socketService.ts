import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

interface SocketUser {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

export const initializeSocketIO = (io: Server) => {
  // Middleware de autenticación para Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback_secret'
      ) as { user: SocketUser };
      
      socket.data.user = decoded.user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser;
    console.log(`Usuario conectado: ${user.email} (${user.role})`);

    // Unir al usuario a su sala basada en rol
    socket.join(user.role);
    socket.join(`user_${user.id}`);

    // Eventos del cliente
    socket.on('join_tank', (tankId: string) => {
      socket.join(`tank_${tankId}`);
      console.log(`Usuario ${user.email} se unió al tanque ${tankId}`);
    });

    socket.on('leave_tank', (tankId: string) => {
      socket.leave(`tank_${tankId}`);
      console.log(`Usuario ${user.email} dejó el tanque ${tankId}`);
    });

    socket.on('request_sensor_data', (sensorId: string) => {
      // Emitir datos del sensor específico
      socket.emit('sensor_data_response', {
        sensorId,
        message: 'Datos solicitados'
      });
    });

    socket.on('disconnect', () => {
      console.log(`Usuario desconectado: ${user.email}`);
    });
  });

  return io;
};

// Función para emitir datos de sensores a todos los clientes conectados
export const emitSensorData = (io: Server, data: any) => {
  io.emit('sensor_data', data);
};

// Función para emitir alertas críticas
export const emitCriticalAlert = (io: Server, alert: any) => {
  io.to('admin').emit('critical_alert', alert);
};

// Función para emitir actualizaciones de tanque
export const emitTankUpdate = (io: Server, tankId: string, data: any) => {
  io.to(`tank_${tankId}`).emit('tank_update', data);
};