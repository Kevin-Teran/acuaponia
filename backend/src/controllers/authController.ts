import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * @desc Genera un par de tokens (acceso y refresco) para un usuario autenticado.
 * @param {object} user - Objeto de usuario que contiene id, email y role.
 * @returns {{accessToken: string, refreshToken: string}} Un objeto con ambos tokens.
 */
const generateTokens = (user: { id: string; email: string; role: string }) => {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    logger.error('Secretos JWT no definidos en el archivo .env');
    throw new CustomError('Error de configuración del servidor.', 500);
  }
  
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    jwtSecret,
    { expiresIn: '1h' } 
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    jwtRefreshSecret,
    { expiresIn: '7d' } 
  );

  return { accessToken, refreshToken };
};

/**
 * @desc     Autentica a un usuario, verifica su estado y rol, y devuelve sus datos junto con los tokens.
 * @route    POST /api/auth/login
 * @access   Public
 */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    logger.warn(`Intento de login fallido para: ${email}`);
    throw new CustomError('Credenciales inválidas.', 401);
  }

  if (user.status !== 'ACTIVE') {
    logger.warn(`Intento de login fallido: la cuenta de ${email} está en estado '${user.status}'`);
    throw new CustomError('Tu cuenta se encuentra inactiva o suspendida.', 403); // 403 Forbidden
  }

  const tokens = generateTokens(user);

  prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  }).catch(err => logger.error(`Error al actualizar lastLogin para ${user.email}:`, err));
  
  logger.info(`Login exitoso para el usuario: ${user.email} (Rol: ${user.role})`);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tokens,
    },
  });
};

/**
 * @desc     Genera un nuevo token de acceso usando un token de refresco válido.
 * @route    POST /api/auth/refresh
 * @access   Public
 */
export const refresh = async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new CustomError('Refresh token es requerido.', 400);
  }

  try {
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET!;
    const decoded = jwt.verify(refreshToken, jwtRefreshSecret) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new CustomError('Refresh token no es válido o el usuario está inactivo.', 401);
    }

    const { accessToken } = generateTokens(user);
    res.json({ success: true, data: { accessToken } });

  } catch (error) {
    logger.error('Error en refresh token:', error);
    throw new CustomError('Refresh token inválido o expirado.', 401);
  }
};

/**
 * @desc     Obtiene la información del usuario actualmente autenticado a partir del token.
 * @route    GET /api/auth/me
 * @access   Private
 */
export const getMe = async (req: Request, res: Response) => {
  // @ts-ignore
  const userPayload = req.user;

  res.json({ success: true, data: { user: userPayload } });
};

/**
 * @desc     Cierra la sesión del usuario. En una implementación real, se podría invalidar el refresh token.
 * @route    POST /api/auth/logout
 * @access   Private
 */
export const logout = async (req: Request, res: Response) => {
  // @ts-ignore
  logger.info(`Logout para el usuario: ${req.user?.email}`);
  res.json({ success: true, message: 'Sesión cerrada exitosamente.' });
};