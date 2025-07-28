import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { asyncHandler, CustomError } from '../middleware/errorHandler';
import { userValidation } from '../middleware/validation';
import { logger } from '../utils/logger';

const router = express.Router();

// GET /api/users - Listar usuarios
router.get('/', userValidation.query, asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, status } = req.query;
  
  const where: any = {};
  
  if (search) {
    where.OR = [
      { name: { contains: search as string } },
      { email: { contains: search as string } }
    ];
  }
  
  if (status) {
    where.status = status;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
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

// POST /api/users - Crear usuario
router.post('/', userValidation.create, asyncHandler(async (req, res) => {
  const { email, password, name, role = 'USER' } = req.body;

  // Verificar si el email ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (existingUser) {
    throw new CustomError('El email ya está registrado', 409);
  }

  // Encriptar contraseña
  const hashedPassword = await bcrypt.hash(password, 12);

  // Crear usuario
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: role as any,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
    }
  });

  logger.info(`Usuario creado: ${user.email}`);

  res.status(201).json({
    success: true,
    data: { user },
    message: 'Usuario creado exitosamente'
  });
}));

// PUT /api/users/:id - Actualizar usuario
router.put('/:id', userValidation.update, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { email, name, role, status } = req.body;

  const updateData: any = {};
  
  if (email) updateData.email = email.toLowerCase();
  if (name) updateData.name = name;
  if (role) updateData.role = role;
  if (status) updateData.status = status;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      lastLogin: true,
    }
  });

  logger.info(`Usuario actualizado: ${user.email}`);

  res.json({
    success: true,
    data: { user },
    message: 'Usuario actualizado exitosamente'
  });
}));

// PATCH /api/users/:id/toggle-status - Cambiar estado del usuario
router.patch('/:id/toggle-status', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const currentUser = await prisma.user.findUnique({
    where: { id },
    select: { status: true, email: true }
  });

  if (!currentUser) {
    throw new CustomError('Usuario no encontrado', 404);
  }

  const newStatus = currentUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

  const user = await prisma.user.update({
    where: { id },
    data: { status: newStatus },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
    }
  });

  logger.info(`Estado de usuario cambiado: ${user.email} -> ${newStatus}`);

  res.json({
    success: true,
    data: { user },
    message: `Usuario ${newStatus === 'ACTIVE' ? 'activado' : 'desactivado'} exitosamente`
  });
}));

// DELETE /api/users/:id - Eliminar usuario
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true }
  });

  if (!user) {
    throw new CustomError('Usuario no encontrado', 404);
  }

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