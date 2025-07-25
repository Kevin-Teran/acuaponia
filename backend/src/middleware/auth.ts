import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
  user: {
    id: string;
    email: string;
    role: 'admin' | 'user';
  };
}

declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        email: string;
        role: 'admin' | 'user';
      };
    }
  }
}

export const auth = (req: Request, res: Response, next: NextFunction) => {
  // Obtener token del header
  const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No hay token, acceso denegado'
    });
  }

  try {
    // Verificar token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'fallback_secret'
    ) as JwtPayload;

    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
};

// Middleware para verificar rol de administrador
export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acceso denegado. Se requieren permisos de administrador.'
    });
  }
  next();
};