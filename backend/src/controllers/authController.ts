import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// --- FUNCIÓN AUXILIAR PARA GENERAR TOKENS ---
const generateTokens = (user: { id: string; email: string; role: string; }) => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (typeof jwtSecret !== 'string' || typeof jwtRefreshSecret !== 'string') {
    logger.error('Las claves JWT_SECRET o JWT_REFRESH_SECRET no están definidas en el entorno.');
    throw new CustomError('Error de configuración del servidor.', 500);
  }

  const accessTokenOptions: jwt.SignOptions = { expiresIn: '24h' };
  const refreshTokenOptions: jwt.SignOptions = { expiresIn: '7d' };

  const accessToken = jwt.sign({ userId: user.id, email: user.email, role: user.role }, jwtSecret, accessTokenOptions);
  const refreshToken = jwt.sign({ userId: user.id }, jwtRefreshSecret, refreshTokenOptions);

  return { accessToken, refreshToken };
};

// --- CONTROLADORES EXPORTADOS ---

// Controlador para el inicio de sesión
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

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

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new CustomError('Credenciales inválidas', 401);
  }

  if (user.status !== 'ACTIVE') {
    throw new CustomError('Cuenta inactiva o suspendida', 401);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const tokens = generateTokens(user);
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
      tokens,
    },
  });
};

// Controlador para refrescar el token
export const refresh = async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new CustomError('Refresh token requerido', 400);
  }

  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
  if (typeof jwtRefreshSecret !== 'string') {
    throw new CustomError('Error de configuración del servidor.', 500);
  }

  try {
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as any;
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new CustomError('Usuario no válido', 401);
    }

    const { accessToken } = generateTokens(user);

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
};

// Controlador para obtener el perfil del usuario
export const getMe = async (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw new CustomError('Token de acceso requerido', 401);
  }
  
  const jwtSecret = process.env.JWT_SECRET;
  if (typeof jwtSecret !== 'string') {
    throw new CustomError('Error de configuración del servidor.', 500);
  }

  try {
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
    throw new CustomError('Token inválido', 401);
  }
};

// Controlador para cerrar sesión
export const logout = async (req: Request, res: Response) => {
  logger.info('Usuario cerró sesión');
  res.json({ success: true, message: 'Sesión cerrada exitosamente' });
};