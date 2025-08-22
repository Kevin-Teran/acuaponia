/**
 * @file userService.ts
 * @description Servicio para gestionar todas las operaciones CRUD relacionadas con los usuarios.
 */
import { api } from '@/config/api';
import { User } from '@/types';

/**
 * @function getAllUsers
 * @description Obtiene una lista de todos los usuarios para la tabla de administración.
 * @returns {Promise<User[]>} Un array de usuarios.
 */
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get('/users');
    return response.data;
  } catch (error) {
    console.error("Error al obtener todos los usuarios:", error);
    throw error;
  }
};

/**
 * @function getUserById
 * @description Obtiene los detalles completos de un solo usuario por su ID.
 * @param {string} userId - El ID del usuario a consultar.
 * @returns {Promise<User>} El objeto de usuario completo.
 */
export const getUserById = async (userId: string): Promise<User> => {
  try {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error(`Error al obtener el usuario ${userId}:`, error);
    throw error;
  }
};

/**
 * @function createUser
 * @description Envía los datos de un nuevo usuario al backend para su creación.
 * @param {Omit<User, 'id'>} userData - Los datos del usuario a crear.
 * @returns {Promise<User>} El usuario recién creado.
 */
export const createUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  try {
    const response = await api.post('/users', userData);
    return response.data;
  } catch (error) {
    console.error("Error al crear el usuario:", error);
    throw error;
  }
};

/**
 * @function updateUser
 * @description Actualiza la información de un usuario específico por su ID.
 * @param {string} userId - El ID del usuario a actualizar.
 * @param {Partial<User>} userData - Los datos del usuario a actualizar.
 * @returns {Promise<User>} El usuario con los datos actualizados.
 */
export const updateUser = async (userId: string, userData: Partial<User>): Promise<User> => {
  try {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar el usuario ${userId}:`, error);
    throw error;
  }
};

/**
 * @function deleteUser
 * @description Elimina un usuario por su ID.
 * @param {string} userId - El ID del usuario a eliminar.
 * @returns {Promise<void>}
 */
export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await api.delete(`/users/${userId}`);
  } catch (error) {
    console.error(`Error al eliminar el usuario ${userId}:`, error);
    throw error;
  }
};