import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { asyncHandler, CustomError } from '../middleware/errorHandler';
import { authValidation } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = express.Router();

// POST /api/auth/login
router.post('/login', authValidation.login, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Buscar usuario
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: {
      id: true,
      email: true,
      password: true,
      name: true,
      role: true,
      status: true,
      lastLogin: true,
    },
  });

  if (!user) {
    throw new CustomError('Credenciales inválidas', 401);
  }

  if (user.status !== 'ACTIVE') {
    throw new CustomError('Cuenta inactiva o suspendida', 401);
  }

  // Verificar contraseña
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new CustomError('Credenciales inválidas', 401);
  }

  // Actualizar último login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  // Generar tokens
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  logger.info(`Usuario autenticado: ${user.email}`);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        lastLogin: user.lastLogin,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    },
  });
}));

// POST /api/auth/refresh
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new CustomError('Refresh token requerido', 400);
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new CustomError('Usuario no válido', 401);
    }

    // Generar nuevo access token
    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });

  } catch (error) {
    throw new CustomError('Refresh token inválido', 401);
  }
}));

// GET /api/auth/me
router.get('/me', asyncHandler(async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new CustomError('Token de acceso requerido', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new CustomError('Usuario no válido', 401);
    }

    res.json({
      success: true,
      data: { user },
    });

  } catch (error) {
    throw new CustomError('Token inválido', 401);
  }
}));

// POST /api/auth/logout
router.post('/logout', asyncHandler(async (req, res) => {
  // En una implementación real, aquí invalidarías el token
  // Por ahora solo enviamos respuesta exitosa
  
  logger.info('Usuario cerró sesión');
  
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente',
  });
}));

export default router;