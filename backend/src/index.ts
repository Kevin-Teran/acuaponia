import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';

// Importar rutas
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import sensorRoutes from './routes/sensors';
import tankRoutes from './routes/tanks';
import dataRoutes from './routes/data';
import reportRoutes from './routes/reports';

// Importar middlewares
import { errorHandler } from './middleware/errorHandler';
import { connectDB } from './config/database';
import { initializeSocketIO } from './services/socketService';
import { startSensorSimulation } from './services/sensorService';

// Cargar variables de entorno
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Conectar a la base de datos
connectDB();

// Middlewares de seguridad
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Demasiadas solicitudes desde esta IP, intente nuevamente más tarde.'
  }
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sensors', sensorRoutes);
app.use('/api/tanks', tankRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/reports', reportRoutes);

// Ruta de salud del servidor
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Manejo de errores
app.use(errorHandler);

// Inicializar Socket.IO
initializeSocketIO(io);

// Iniciar simulación de sensores (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  startSensorSimulation(io);
}

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`
🚀 Servidor SENA Acuaponía iniciado
📍 Puerto: ${PORT}
🌍 Entorno: ${process.env.NODE_ENV || 'development'}
🔗 API: http://localhost:${PORT}/api
📊 Health: http://localhost:${PORT}/api/health
  `);
});

export default app;