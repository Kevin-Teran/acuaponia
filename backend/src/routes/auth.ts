import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authValidation } from '../middleware/validation';
import { login, refresh, getMe, logout } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware'; 
import { logger } from '../utils/logger';

const router = express.Router();

// Middleware para registrar cada petición a las rutas de autenticación
router.use((req, res, next) => {
  logger.info(`Auth request: ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    // Ocultar la contraseña en los logs por seguridad
    body: req.method === 'POST' ? { ...req.body, password: '[OCULTO]' } : undefined
  });
  next();
});

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión de usuario.
 * @access  Public
 */
router.post('/login', 
  authValidation.login, 
  asyncHandler(login)
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Renovar el token de acceso usando el token de refresco.
 * @access  Public
 */
router.post('/refresh', 
  authValidation.refreshToken,
  asyncHandler(refresh)
);

/**
 * @route   GET /api/auth/me
 * @desc    Obtener datos del usuario actualmente autenticado.
 * @access  Private (Requiere token)
 */
router.get('/me', 
  protect, // <-- CORRECCIÓN: Se añade el middleware para proteger la ruta
  asyncHandler(getMe)
);

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar la sesión del usuario.
 * @access  Private (Requiere token)
 */
router.post('/logout', 
  protect, // <-- CORRECCIÓN: Se añade el middleware para proteger la ruta
  asyncHandler(logout)
);

/**
 * @route   GET /api/auth/health
 * @desc    Ruta de prueba para verificar que el servicio de autenticación funciona.
 * @access  Public
 */
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Servicio de autenticación está funcionando.',
    timestamp: new Date().toISOString()
  });
});

export default router;
