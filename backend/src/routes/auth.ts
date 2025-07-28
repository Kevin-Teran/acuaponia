import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authValidation } from '../middleware/validation';
import { login, refresh, getMe, logout } from '../controllers/authController';
import { logger } from '../utils/logger';

const router = express.Router();

// Middleware para logging de rutas de auth
router.use((req, res, next) => {
  logger.info(`Auth request: ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' ? { ...req.body, password: '[HIDDEN]' } : undefined
  });
  next();
});

// POST /api/auth/login - Iniciar sesión
router.post('/login', 
  authValidation.login, 
  asyncHandler(login)
);

// POST /api/auth/refresh - Renovar token
router.post('/refresh', 
  authValidation.refreshToken,
  asyncHandler(refresh)
);

// GET /api/auth/me - Obtener información del usuario actual
router.get('/me', 
  asyncHandler(getMe)
);

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', 
  asyncHandler(logout)
);

// Ruta de prueba para verificar que el servidor auth funciona
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString()
  });
});

export default router;