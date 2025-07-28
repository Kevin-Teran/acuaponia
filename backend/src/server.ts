// backend/src/server.ts

// --- IMPORTACIONES DE PAQUETES ---
import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
// Import Server desde socket.io
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
// Importante para el manejo de errores en rutas async
import 'express-async-errors';

// --- IMPORTACIONES DE LA APLICACIÓN ---
import logger from './utils/logger';
// Importación de la función para inicializar la conexión MQTT (CORREGIDO)
import { initializeMQTT } from './services/mqttService';
// Importación del manejador de errores
import { errorHandler } from './middleware/errorHandler';

// --- IMPORTACIÓN DE RUTAS ---
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import tankRoutes from './routes/tanks';
import sensorRoutes from './routes/sensors';
import dataRoutes from './routes/data';
import alertRoutes from './routes/alerts';
import reportRoutes from './routes/reports';

// Cargar variables de entorno desde el archivo .env
dotenv.config();

const app = express();
const server = http.createServer(app);

// --- INICIALIZACIÓN DE SOCKET.IO (CORREGIDO) ---
// Se inicializa Socket.IO directamente aquí para resolver el conflicto de tipos.
const io = new SocketIOServer(server, {
  cors: {
    origin: "*", // Para desarrollo. En producción, se debe ser más específico.
    methods: ["GET", "POST"]
  }
});

// --- MIDDLEWARE ---
app.use(cors()); // Habilita CORS para permitir peticiones desde el frontend
app.use(express.json()); // Permite al servidor entender JSON en el body de las peticiones

// Middleware para registrar cada petición
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`Petición entrante: ${req.method} ${req.originalUrl}`);
  next();
});

// --- LÓGICA DE WEBSOCKETS ---
// Escuchador de conexiones para Socket.IO
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

// Ruta raíz para verificar que el servidor está funcionando
app.get('/', (req: Request, res: Response) => {
  res.status(200).send('El backend del sistema de Acuaponía está funcionando correctamente.');
});

// Middleware para manejar errores. Debe ser el último middleware que se añade.
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  logger.info(`Servidor escuchando en el puerto ${PORT}`);
  
  // Una vez que el servidor está levantado, inicializar la conexión al broker MQTT. (CORREGIDO)
  // Esta función ya no necesita la instancia 'io' porque el servicio MQTT
  // se comunica con el servicio de sockets internamente.
  initializeMQTT();
});

// Exportar para posibles pruebas en el futuro
export { app, server, io };
