import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { Role, UserStatus } from '@prisma/client';

/**
 * @desc     Obtiene todos los usuarios con paginación, filtros y conteo de tanques.
 * @route    GET /api/users
 * @access   Private (Admin)
 */
export const getUsers = async (req: Request, res: Response) => {
    const { page = 1, limit = 10, role, status } = req.query;

    const where: any = {};
    if (role) where.role = role as Role;
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
                _count: {
                    select: { tanks: true } // ¡IMPORTANTE! Conteo de tanques
                }
            },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: (Number(page) - 1) * Number(limit),
        }),
        prisma.user.count({ where })
    ]);

    res.json({ success: true, data: { users, pagination: { /* ... */ } } });
};

/**
 * @desc     Obtiene los detalles completos de un usuario, incluyendo sus tanques.
 * @route    GET /api/users/:id
 * @access   Private (Admin)
 */
export const getUserById = async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true, name: true, email: true, role: true, status: true, createdAt: true, lastLogin: true,
            tanks: { select: { id: true, name: true, location: true } }
        }
    });
    if (!user) throw new CustomError('Usuario no encontrado', 404);
    res.json({ success: true, data: user });
};

/**
 * @desc     Crea un nuevo usuario.
 * @route    POST /api/users
 * @access   Private (Admin)
 */
export const createUser = async (req: Request, res: Response) => {
    const { name, email, password, role, status } = req.body;
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new CustomError('El correo electrónico ya está en uso', 409);

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { name, email, password: hashedPassword, role: role as Role, status: status as UserStatus },
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, lastLogin: true, _count: { select: { tanks: true } } }
    });

    logger.info(`Usuario creado: ${user.email}`);
    res.status(201).json({ success: true, data: user, message: 'Usuario creado exitosamente' });
};

/**
 * @desc     Actualiza un usuario.
 * @route    PUT /api/users/:id
 * @access   Private (Admin)
 */
export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, role, status, password } = req.body;
    // @ts-ignore
    const currentUserId = req.user?.id; // Obtener desde el middleware de auth

    if (id === currentUserId && status !== 'ACTIVE') {
        throw new CustomError('No puedes cambiar tu propio estado a inactivo.', 403);
    }

    const updateData: any = { name, email, role: role as Role, status: status as UserStatus };
    if (password) {
        updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, lastLogin: true, _count: { select: { tanks: true } } }
    });
    
    logger.info(`Usuario actualizado: ${user.email}`);
    res.json({ success: true, data: user, message: 'Usuario actualizado exitosamente' });
};

/**
 * @desc     Elimina un usuario.
 * @route    DELETE /api/users/:id
 * @access   Private (Admin)
 */
export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    // @ts-ignore
    const currentUserId = req.user?.id;
    
    if (id === currentUserId) {
        throw new CustomError('No puedes eliminar tu propia cuenta.', 403);
    }
    
    await prisma.user.delete({ where: { id } });
    logger.info(`Usuario eliminado: ${id}`);
    res.json({ success: true, message: 'Usuario eliminado exitosamente' });
};

/**
 * @desc     Obtiene todos los usuarios (para vistas de administrador).
 * @route    GET /api/users/all
 * @access   Private (Admin)
 */
 export const getAllUsers = async (req: Request, res: Response) => {
    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: users });
};