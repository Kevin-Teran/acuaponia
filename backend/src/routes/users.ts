import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { asyncHandler, CustomError } from '../middleware/errorHandler';
import { userValidation } from '../middleware/validation';
import { logger } from '../utils/logger';
import { Role, UserStatus } from '@prisma/client';

const router = express.Router();

// GET /api/users - Listar usuarios
router.get('/', userValidation.query, asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, role, status } = req.query;
  
  const where: any = {};
  
  // Se usa el tipo 'Role'
  if (role) where.role = role as Role;
  // Se usa el tipo 'UserStatus'
  if (status) where.status = status as UserStatus;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: (Number(page) - 1) * Number(limit),
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
}));

// POST /api/users - Crear un nuevo usuario (ruta de administrador)
router.post('/', userValidation.create, asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role, status } = req.body;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new CustomError('El correo electrónico ya está en uso', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      // Se usa el tipo 'Role'
      role: role as Role,
      // Se usa el tipo 'UserStatus'
      status: status as UserStatus,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    }
  });

  logger.info(`Usuario creado por un administrador: ${user.email}`);

  res.status(201).json({
    success: true,
    data: { user },
    message: 'Usuario creado exitosamente'
  });
}));

// GET /api/users/:id - Obtener un usuario específico
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      lastLogin: true,
      tanks: {
        select: { id: true, name: true }
      }
    }
  });

  if (!user) {
    throw new CustomError('Usuario no encontrado', 404);
  }

  res.json({
    success: true,
    data: { user }
  });
}));


// PUT /api/users/:id - Actualizar un usuario
router.put('/:id', userValidation.update, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email, role, status } = req.body;

  const updateData: any = {};
  
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  // Se usa el tipo 'Role'
  if (role) updateData.role = role as Role;
  // Se usa el tipo 'UserStatus'
  if (status) updateData.status = status as UserStatus;

  // Verificar si el nuevo email ya está en uso por otro usuario
  if (email) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        id: { not: id }
      }
    });
    if (existingUser) {
      throw new CustomError('El correo electrónico ya está en uso por otro usuario', 409);
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    }
  });

  logger.info(`Usuario actualizado: ${user.email}`);

  res.json({
    success: true,
    data: { user },
    message: 'Usuario actualizado exitosamente'
  });
}));

// DELETE /api/users/:id - Eliminar un usuario
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true }
  });

  if (!user) {
    throw new CustomError('Usuario no encontrado', 404);
  }

  // Aquí se podría añadir lógica para reasignar los tanques del usuario, etc.
  await prisma.user.delete({
    where: { id }
  });

  logger.info(`Usuario eliminado: ${user.email}`);

  res.json({
    success: true,
    message: 'Usuario eliminado exitosamente'
  });
}));

export default router;