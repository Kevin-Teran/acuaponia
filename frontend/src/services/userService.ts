/**
 * @file userService.ts
 * @description Servicio para gestionar las operaciones CRUD de usuarios.
 * @author kevin mariano
 * @version 2.3.0
 * @since 1.0.0
 */

import api from '@/config/api';
import { User, CreateUserDto, UpdateUserDto, UserFromApi } from '@/types';

/**
 * @function getUsers
 * @description Obtiene una lista de todos los usuarios desde la API.
 * @returns {Promise<UserFromApi[]>} Una promesa que se resuelve con un array de usuarios.
 * @throws {Error} Si la petición falla.
 */
const getUsers = async (): Promise<UserFromApi[]> => {
  const response = await api.get<UserFromApi[]>('/users');
  return response.data;
};

/**
 * @function getUserById
 * @description Obtiene un usuario específico por su ID.
 * @param {string} id - El ID del usuario.
 * @returns {Promise<User>}
 */
const getUserById = async (id: string): Promise<User> => {
  const response = await api.get<User>(`/users/${id}`);
  return response.data;
};

/**
 * @function createUser
 * @description Crea un nuevo usuario.
 * @param {CreateUserDto} userData - Datos del nuevo usuario.
 * @returns {Promise<User>}
 */
const createUser = async (userData: CreateUserDto): Promise<User> => {
  const response = await api.post<User>('/users', userData);
  return response.data;
};

/**
 * @function updateUser
 * @description Actualiza un usuario existente.
 * @param {string} id - ID del usuario.
 * @param {UpdateUserDto} userData - Datos a actualizar.
 * @returns {Promise<User>}
 */
const updateUser = async (id: string, userData: UpdateUserDto): Promise<User> => {
  const response = await api.put<User>(`/users/${id}`, userData);
  return response.data;
};

/**
 * @function deleteUser
 * @description Elimina un usuario.
 * @param {string} id - ID del usuario.
 * @returns {Promise<void>}
 */
const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};

export const userService = {
  getUsers, 
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};