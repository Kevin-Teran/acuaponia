import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Importar configuraciones y servicios
import { connectDatabase } from './config/database';
import { initializeMQTT } from './services/mqttService';
import { initializeSocket } from './services/socketService';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';

// Importar rutas
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import sensorRoutes from './routes/sensors';
import tankRoutes from './routes/tanks';
import dataRoutes from './routes/data';
import alertRoutes from './routes/alerts';
import reportRoutes from './routes/reports';

// Cargar variables de entorno
dotenv.config();

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // límite de requests por IP
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intente nuevamente más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware de seguridad y utilidades
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Aplicar rate limiting
app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/tanks', tankRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/reports', reportRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.originalUrl,
    method: req.method
  });
});

// Error handling middleware
app.use(errorHandler);

// Función para inicializar el servidor
async function startServer() {
  try {
    // Conectar a la base de datos
    await connectDatabase();
    logger.info('✅ Base de datos MySQL conectada exitosamente');

    // Inicializar MQTT
    await initializeMQTT();
    logger.info('✅ Cliente MQTT inicializado exitosamente');

    // Inicializar Socket.IO
    initializeSocket(io);
    logger.info('✅ Socket.IO inicializado exitosamente');

    // Iniciar servidor
    server.listen(PORT, HOST, () => {
      logger.info(`🚀 Servidor iniciado en http://${HOST}:${PORT}`);
      logger.info(`📊 Dashboard disponible en http://${HOST}:${PORT}/health`);
      logger.info(`🌍 Entorno: ${process.env.NODE_ENV}`);
    });

    // Manejo de cierre graceful
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    }, parseInt(process.env.GRACEFUL_SHUTDOWN_TIMEOUT || '10000'));
    logger.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Función de cierre graceful
function gracefulShutdown(signal: string) {
  logger.info(`📴 Recibida señal ${signal}. Cerrando servidor...`);
  
  server.close(() => {
    logger.info('✅ Servidor HTTP cerrado');
    
    // Cerrar conexiones de base de datos, MQTT, etc.
    process.exit(0);
  });

  // Forzar cierre después de 10 segundos
  setTimeout(() => {
    logger.error('❌ Forzando cierre del servidor');
    process.exit(1);
  }, 10000);
}

// Iniciar el servidor
startServer();

export { app, server, io };