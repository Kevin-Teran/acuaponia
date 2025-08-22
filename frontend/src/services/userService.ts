/**
 * @file userService.ts
 * @description Servicio para interactuar con la API de usuarios del backend.
 * Este archivo centraliza todas las llamadas HTTP relacionadas con la gestión de usuarios.
 * @author Kevin Mariano
 * @version 1.2.0
 * @since 1.0.0
 */

import api from '../config/api'; // Corregido: La ruta es un nivel arriba
import { User } from '../types';

/**
 * @typedef {Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }} CreateUserInput
 * @description Tipo de datos para crear un nuevo usuario.
 */
type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'> & {
  password?: string;
};

/**
 * @typedef {Partial<CreateUserInput>} UpdateUserInput
 * @description Tipo de datos para actualizar un usuario existente. Todas las propiedades son opcionales.
 */
type UpdateUserInput = Partial<CreateUserInput>;

/**
 * @constant userService
 * @description Objeto que agrupa las funciones para realizar operaciones CRUD en la entidad de usuarios.
 */
export const userService = {
  /**
   * @method getUsers
   * @description Obtiene la lista completa de usuarios desde el backend.
   * @returns {Promise<User[]>} Una promesa que se resuelve con un arreglo de objetos de usuario.
   * @throws {Error} Si la petición a la API falla.
   * @example
   * async function fetchUsers() {
   * const users = await userService.getUsers();
   * console.log(users);
   * }
   */
  getUsers: async (): Promise<User[]> => {
    try {
      const response = await api.get<User[]>('/users');
      return response.data;
    } catch (error) {
      console.error('Error en getUsers:', error);
      throw new Error('Error al obtener la lista de usuarios');
    }
  },

  /**
   * @method createUser
   * @description Envía una petición para crear un nuevo usuario.
   * @param {CreateUserInput} userData - Los datos del nuevo usuario a crear.
   * @returns {Promise<User>} Una promesa que se resuelve con el objeto del usuario creado.
   * @throws {Error} Si la petición a la API falla.
   */
  createUser: async (userData: CreateUserInput): Promise<User> => {
    try {
      const response = await api.post<User>('/users', userData);
      return response.data;
    } catch (error) {
      console.error('Error en createUser:', error);
      throw new Error('Error al crear el usuario');
    }
  },

  /**
   * @method updateUser
   * @description Envía una petición para actualizar un usuario existente.
   * @param {string} id - El ID del usuario a actualizar.
   * @param {UpdateUserInput} userData - Los datos del usuario a modificar.
   * @returns {Promise<User>} Una promesa que se resuelve con el objeto del usuario actualizado.
   * @throws {Error} Si la petición a la API falla.
   */
  updateUser: async (id: string, userData: UpdateUserInput): Promise<User> => {
    try {
      const response = await api.patch<User>(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error('Error en updateUser:', error);
      throw new Error('Error al actualizar el usuario');
    }
  },

  /**
   * @method deleteUser
   * @description Envía una petición para eliminar un usuario.
   * @param {string} id - El ID del usuario a eliminar.
   * @returns {Promise<void>} Una promesa que se resuelve cuando el usuario ha sido eliminado.
   * @throws {Error} Si la petición a la API falla.
   */
  deleteUser: async (id: string): Promise<void> => {
    try {
      await api.delete(`/users/${id}`);
    } catch (error) {
      console.error('Error en deleteUser:', error);
      throw new Error('Error al eliminar el usuario');
    }
  },
};