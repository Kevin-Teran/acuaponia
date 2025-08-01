import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * @desc     Obtiene una lista paginada de todos los usuarios.
 * @route    GET /api/users
 * @access   Private (Admin)
 */
export const getUsers = async (req: Request, res: Response) => {
    const { page = 1, limit = 10 } = req.query;

    const [users, total] = await prisma.$transaction([
        prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
                lastLogin: true,
                _count: {
                    select: { tanks: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: (Number(page) - 1) * Number(limit),
        }),
        prisma.user.count()
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
};

/**
 * @desc     Obtiene los detalles completos de un usuario por su ID.
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

    if (!user) {
        throw new CustomError('Usuario no encontrado', 404);
    }
    res.json({ success: true, data: user });
};

/**
 * @desc     Crea un nuevo usuario.
 * @route    POST /api/users
 * @access   Private (Admin)
 */
export const createUser = async (req: Request, res: Response) => {
    const { name, email, password, role, status } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
        throw new CustomError('El correo electrónico ya está en uso.', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { 
            name, 
            email: email.toLowerCase(), 
            password: hashedPassword, 
            role,   
            status, 
        },
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, lastLogin: true, _count: { select: { tanks: true } } }
    });

    logger.info(`Usuario creado: ${user.email}`);
    res.status(201).json({ success: true, data: user, message: 'Usuario creado exitosamente.' });
};

/**
 * @desc     Actualiza un usuario existente.
 * @route    PUT /api/users/:id
 * @access   Private (Admin)
 */
 export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, role, status, password } = req.body;
    // @ts-ignore
    const currentUserId = req.user?.id;
    // @ts-ignore
    const currentUserRole = req.user?.role;
    
    if (id === currentUserId) {
        if (role !== undefined && role !== currentUserRole) {
            throw new CustomError('No puedes cambiar tu propio rol.', 403);
        }
        if (status !== undefined && status !== 'ACTIVE') {
            throw new CustomError('No puedes desactivar o suspender tu propia cuenta.', 403);
        }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (password) {
        updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, lastLogin: true, _count: { select: { tanks: true } } }
    });
    
    logger.info(`Usuario actualizado: ${user.email}`);
    res.json({ success: true, data: user, message: 'Usuario actualizado exitosamente.' });
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
        throw new CustomError('No puedes eliminar tu propia cuenta de administrador.', 403);
    }
    
    await prisma.user.delete({ where: { id } });
    logger.info(`Usuario eliminado: ${id}`);
    res.json({ success: true, message: 'Usuario eliminado exitosamente.' });
};

/**
 * @desc     Obtiene una lista simple de todos los usuarios (id y nombre).
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
