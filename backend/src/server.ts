// --- IMPORTACIONES DE PAQUETES ---
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import 'express-async-errors';
import path from 'path';

// --- IMPORTACIONES DE LA APLICACIÓN ---
import { logger } from './utils/logger';
import { initializeMQTT } from './services/mqttService';
import { errorHandler, notFound } from './middleware/errorHandler';

// --- IMPORTACIÓN DE RUTAS ---
import authRoutes from './routes/auth';
// Aquí se añadirán las otras rutas más adelante

// --- CONFIGURACIÓN INICIAL ---
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

app.get('/', (req, res) => {
  res.status(200).send('El backend del sistema de Acuaponía está funcionando correctamente.');
});

// --- MANEJO DE ERRORES ---
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

// --- INICIO DEL SERVIDOR ---
// CORRECCIÓN: Se añade la llamada a server.listen para que el servidor se inicie.
server.listen(PORT, () => {
  logger.info(`🚀 Servidor escuchando en el puerto ${PORT}`);
  initializeMQTT();
});

export { app, server, io };