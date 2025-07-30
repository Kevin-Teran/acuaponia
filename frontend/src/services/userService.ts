import api from '../config/api';
import { User } from '../types';

/**
 * @desc     Obtiene la lista de usuarios desde la API.
 * @returns  {Promise<User[]>}
 */
export const getUsers = async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data.data.users;
};

/**
 * @desc     Crea un nuevo usuario a través de la API.
 * @param    userData - Datos del usuario a crear.
 * @returns  {Promise<User>}
 */
export const createUser = async (userData: Partial<User>): Promise<User> => {
    const response = await api.post('/users', userData);
    return response.data.data;
};

/**
 * @desc     Actualiza un usuario existente a través de la API.
 * @param    id - ID del usuario a actualizar.
 * @param    userData - Datos para actualizar.
 * @returns  {Promise<User>}
 */
export const updateUser = async (id: string, userData: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data.data;
};

/**
* @desc     Obtiene los detalles de un usuario específico por su ID.
* @param    id - ID del usuario a obtener.
* @returns  {Promise<User>}
*/
export const getUserById = async (id: string): Promise<User> => {
   const response = await api.get(`/users/${id}`);
   return response.data.data;
};

/**
 * @desc     Elimina un usuario a través de la API.
 * @param    id - ID del usuario a eliminar.
 * @returns  {Promise<void>}
 */
export const deleteUser = async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
};

/**
 * @desc     Obtiene todos los usuarios desde la API.
 * @returns  {Promise<User[]>}
 */
export const getAllUsers = async (): Promise<User[]> => {
    const response = await api.get('/users/all');
    return response.data.data;
};