// backend/src/server.ts

// --- IMPORTACIONES DE PAQUETES ---
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';
import path from 'path'; // Se importa el módulo 'path'

// --- IMPORTACIONES DE LA APLICACIÓN ---
import logger from './utils/logger';
import { initializeMQTT } from './services/mqttService';
import { errorHandler } from './middleware/errorHandler';

// --- IMPORTACIÓN DE RUTAS ---
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import tankRoutes from './routes/tanks';
import sensorRoutes from './routes/sensors';
import dataRoutes from './routes/data';
import alertRoutes from './routes/alerts';
import reportRoutes from './routes/reports';

// --- CORRECCIÓN AQUÍ ---
// Cargar variables de entorno desde el archivo .env en la raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../../.env') });


const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`Petición entrante: ${req.method} ${req.originalUrl}`);
  next();
});

// --- LÓGICA DE WEBSOCKETS ---
io.on('connection', (socket) => {
  logger.info(`Nuevo cliente conectado vía WebSocket: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`Cliente desconectado: ${socket.id}`);
  });
});

// --- RUTAS DE LA API ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tanks', tankRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);

app.get('/', (req: Request, res: Response) => {
  res.status(200).send('El backend del sistema de Acuaponía está funcionando correctamente.');
});

app.use(errorHandler);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  logger.info(`Servidor escuchando en el puerto ${PORT}`);
  initializeMQTT();
});

export { app, server, io };
