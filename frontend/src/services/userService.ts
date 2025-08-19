/**
 * @file userService.ts
 * @description Servicio para gestionar las operaciones CRUD de usuarios.
 */
 import api from '@/config/api';
 import { User } from '@/types';
 
 /**
  * @function getAllUsers
  * @description Obtiene una lista de todos los usuarios.
  * @returns {Promise<User[]>} Un array de usuarios.
  */
 export const getAllUsers = async (): Promise<User[]> => {
   const response = await api.get('/users');
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
   const response = await api.patch(`/users/${userId}`, userData);
   return response.data;
 };
 
 // Puedes añadir aquí otras funciones que necesites como createUser, deleteUser, etc.