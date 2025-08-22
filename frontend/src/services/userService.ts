/**
 * @file userService.ts
 * @description Servicio para gestionar las operaciones CRUD de usuarios.
 * @author Sistema de Acuaponía SENA
 * @version 1.2.0
 * @since 1.0.0
 */

import api from '@/config/api';
import { User, CreateUserDto, UpdateUserDto } from '@/types';

/**
 * Obtiene una lista de todos los usuarios.
 * @returns {Promise<User[]>} Una promesa que se resuelve con un array de usuarios.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/users');
  return response.data;
};

/**
 * Obtiene un usuario específico por su ID.
 * @param {string} id - El ID del usuario a obtener.
 * @returns {Promise<User>} Una promesa que se resuelve con los datos del usuario.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const getUserById = async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
};

/**
 * Crea un nuevo usuario.
 * @param {CreateUserDto} userData - Los datos del nuevo usuario.
 * @returns {Promise<User>} Una promesa que se resuelve con los datos del usuario creado.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const createUser = async (userData: CreateUserDto): Promise<User> => {
  const response = await api.post('/users', userData);
  return response.data;
};

/**
 * Actualiza los datos de un usuario existente.
 * @param {string} id - El ID del usuario a actualizar.
 * @param {UpdateUserDto} userData - Los nuevos datos para el usuario.
 * @returns {Promise<User>} Una promesa que se resuelve con los datos del usuario actualizado.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const updateUser = async (id: string, userData: UpdateUserDto): Promise<User> => {
  const response = await api.put(`/users/${id}`, userData);
  return response.data;
};

/**
 * Elimina un usuario del sistema.
 * @param {string} id - El ID del usuario a eliminar.
 * @returns {Promise<void>} Una promesa que se resuelve cuando el usuario es eliminado.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/users/${id}`);
};