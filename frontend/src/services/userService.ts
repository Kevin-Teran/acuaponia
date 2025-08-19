/**
 * @file userService.ts
 * @description Servicio para gestionar todas las operaciones CRUD relacionadas con los usuarios.
 */
 import api from '@/config/api';
 import { User } from '@/types';
 
 /**
  * @function getAllUsers
  * @description Obtiene una lista de todos los usuarios para la tabla de administración.
  * @returns {Promise<User[]>} Un array de usuarios.
  */
 export const getAllUsers = async (): Promise<User[]> => {
   const response = await api.get('/users');
   return response.data;
 };
 
 /**
  * @function getUserById
  * @description Obtiene los detalles completos de un solo usuario por su ID.
  * @param {string} userId - El ID del usuario a consultar.
  * @returns {Promise<User>} El objeto de usuario completo.
  */
 export const getUserById = async (userId: string): Promise<User> => {
   const response = await api.get(`/users/${userId}`);
   return response.data;
 };
 
 /**
  * @function createUser
  * @description Envía los datos de un nuevo usuario al backend para su creación.
  * @param {Partial<User>} userData - Los datos del usuario a crear.
  * @returns {Promise<User>} El usuario recién creado.
  */
 export const createUser = async (userData: Partial<User>): Promise<User> => {
   const response = await api.post('/users', userData);
   return response.data;
 };
 
 /**
  * @function updateUser
  * @description Actualiza la información de un usuario específico por su ID.
  * @param {string} userId - El ID del usuario a actualizar.
  * @param {Partial<User>} userData - Los datos del usuario a actualizar.
  * @returns {Promise<User>} El usuario con los datos actualizados.
  */
 export const updateUser = async (userId: string, userData: Partial<User>): Promise<User> => {
   const response = await api.put(`/users/${userId}`, userData);
   return response.data;
 };
 
 /**
  * @function deleteUser
  * @description Elimina un usuario por su ID.
  * @param {string} userId - El ID del usuario a eliminar.
  * @returns {Promise<void>}
  */
 export const deleteUser = async (userId: string): Promise<void> => {
   await api.delete(`/users/${userId}`);
 };