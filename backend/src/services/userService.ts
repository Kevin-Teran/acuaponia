import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import { CustomError } from '../middleware/errorHandler';

/**
 * @desc Obtiene una lista paginada de todos los usuarios.
 * @param {object} options - Opciones de paginación.
 * @param {number} options.page - Número de página.
 * @param {number} options.limit - Número de resultados por página.
 * @returns {Promise<object>} Un objeto con la lista de usuarios y la información de paginación.
 */
export const getUsers = async (options: { page: number; limit: number }) => {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    const [users, total] = await prisma.$transaction([
        prisma.user.findMany({
            select: {
                id: true, name: true, email: true, role: true, status: true,
                createdAt: true, lastLogin: true, _count: { select: { tanks: true } }
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: skip,
        }),
        prisma.user.count()
    ]);

    return {
        users,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    };
};

/**
 * @desc Obtiene los detalles completos de un usuario por su ID.
 * @param {string} id - El ID del usuario.
 * @returns {Promise<object|null>} El usuario encontrado o null.
 */
export const getUserById = async (id: string) => {
    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true, name: true, email: true, role: true, status: true,
            createdAt: true, lastLogin: true,
            tanks: { select: { id: true, name: true, location: true } }
        }
    });
    if (!user) {
        throw new CustomError('Usuario no encontrado', 404);
    }
    return user;
};

/**
 * @desc Crea un nuevo usuario en la base de datos.
 * @param {object} userData - Los datos del usuario a crear.
 * @returns {Promise<object>} El usuario recién creado.
 */
export const createUser = async (userData: any) => {
    const { name, email, password, role, status } = userData;

    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
        throw new CustomError('El correo electrónico ya está en uso.', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    return prisma.user.create({
        data: {
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role,   
            status, 
        },
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, lastLogin: true, _count: { select: { tanks: true } } }
    });
};

/**
 * @desc Actualiza un usuario existente.
 * @param {string} id - El ID del usuario a actualizar.
 * @param {object} userData - Los datos a actualizar.
 * @returns {Promise<object>} El usuario actualizado.
 */
export const updateUser = async (id: string, userData: any) => {
    const { name, email, role, status, password } = userData;
    
    const updateData: any = { name, email: email?.toLowerCase(), role, status };

    if (password) {
        updateData.password = await bcrypt.hash(password, 10);
    }

    return prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, lastLogin: true, _count: { select: { tanks: true } } }
    });
};

/**
 * @desc Elimina un usuario de la base de datos.
 * @param {string} id - El ID del usuario a eliminar.
 * @returns {Promise<void>}
 */
export const deleteUser = async (id: string) => {
    await prisma.user.delete({ where: { id } });
};

/**
 * @desc Obtiene una lista simple de todos los usuarios (id, nombre, email).
 * @returns {Promise<object[]>} Una lista de usuarios.
 */
export const getAllUsers = async () => {
    return prisma.user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
    });
};
