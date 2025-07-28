// backend/src/controllers/authController.ts
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const generateTokens = (user: { id: string; email: string; role: string }) => {
  const jwtSecret = process.env.JWT_SECRET || 'default_secret';
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    jwtRefreshSecret,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    logger.info(`Intento de login para: ${email}`);

    // Validar entrada
    if (!email || !password) {
      logger.warn(`Login fallido: email o password faltante`);
      throw new CustomError('Email y contraseña son requeridos', 400);
    }

    // 1. Buscar usuario por email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      logger.warn(`Intento de login fallido: usuario ${email} no encontrado`);
      throw new CustomError('Credenciales inválidas', 401);
    }

    logger.info(`Usuario encontrado: ${user.email}, status: ${user.status}`);

    // 2. Verificar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Intento de login fallido: contraseña incorrecta para ${email}`);
      throw new CustomError('Credenciales inválidas', 401);
    }

    // 3. Verificar estado de la cuenta
    if (user.status !== 'ACTIVE') {
      logger.warn(`Intento de login fallido: cuenta ${email} inactiva (status: ${user.status})`);
      throw new CustomError('Cuenta inactiva', 403);
    }

    // 4. Actualizar último login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // 5. Generar tokens
    const tokens = generateTokens(user);

    // 6. Responder con los datos del usuario
    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt,
          lastLogin: new Date(), // Usar la fecha actual
        },
        tokens,
      },
    };

    logger.info(`Login exitoso: ${user.email}`);
    res.json(response);

  } catch (error) {
    logger.error('Error en login:', error);
    throw error;
  }
};

export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new CustomError('Refresh token requerido', 400);
  }

  try {
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'default_refresh_secret';
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new CustomError('Usuario no válido', 401);
    }

    const { accessToken } = generateTokens(user);
    res.json({ success: true, data: { accessToken } });
  } catch (error) {
    logger.error('Error en refresh token:', error);
    throw new CustomError('Refresh token inválido', 401);
  }
};

export const getMe = async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    throw new CustomError('Token de acceso requerido', 401);
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'default_secret';
    const decoded = jwt.verify(token, jwtSecret) as any;

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

    res.json({ success: true, data: { user } });
  } catch (error) {
    logger.error('Error en getMe:', error);
    throw new CustomError('Token inválido', 401);
  }
};

export const logout = async (req: Request, res: Response) => {
  logger.info('Usuario cerró sesión');
  res.json({ success: true, message: 'Sesión cerrada exitosamente' });
};