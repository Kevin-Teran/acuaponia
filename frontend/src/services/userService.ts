import api from '../config/api';
import { User } from '../types';

/**
 * @desc     Obtiene la lista de todos los usuarios para la tabla de gestión.
 * @returns  {Promise<User[]>} Una promesa que resuelve a un array de usuarios.
 */
export const getUsers = async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
};

/**
 * @desc     Obtiene los detalles completos de un usuario (incluyendo sus tanques) por su ID.
 * @param    {string} id - El ID del usuario.
 * @returns  {Promise<User>} El objeto del usuario con sus relaciones.
 */
export const getUserById = async (id: string): Promise<User> => {
   const response = await api.get(`/users/${id}`);
   return response.data;
};

/**
 * @desc     Crea un nuevo usuario.
 * @param    {Partial<User>} userData - Datos del usuario a crear.
 * @returns  {Promise<User>} El nuevo usuario creado.
 */
export const createUser = async (userData: Partial<User>): Promise<User> => {
    const response = await api.post('/users', userData);
    return response.data;
};

/**
 * @desc     Actualiza un usuario existente.
 * @param    {string} id - ID del usuario a actualizar.
 * @param    {Partial<User>} userData - Datos para actualizar.
 * @returns  {Promise<User>} El usuario actualizado.
 */
export const updateUser = async (id: string, userData: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
};

/**
 * @desc     Elimina un usuario.
 * @param    {string} id - ID del usuario a eliminar.
 * @returns  {Promise<void>}
 */
export const deleteUser = async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
};

/**
 * @desc     Obtiene una lista simple de todos los usuarios (para menús desplegables).
 * @returns  {Promise<User[]>} Una promesa que resuelve a un array de usuarios simplificado.
 */
export const getAllUsers = async (): Promise<User[]> => {
    const response = await api.get('/users/all');
    return response.data;
};