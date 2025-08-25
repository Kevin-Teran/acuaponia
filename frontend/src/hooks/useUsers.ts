/**
 * @file useUsers.ts
 * @description Hook personalizado para la gestión del estado de los usuarios en la UI.
 * Proporciona lógica para obtener, agregar, editar y eliminar usuarios.
 * @author Kevin Mariano
 * @version 1.2.0
 * @since 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { userService } from '../services/userService';
import { User, UserFromApi } from '../types'; // Asumiendo que UserFromApi es el tipo correcto

/**
 * @typedef {Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }} UserFormData
 * @description Define la estructura de los datos del formulario para crear o editar un usuario.
 */
export type UserFormData = Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin' | '_count'> & {
  password?: string;
};

/**
 * @function useUsers
 * @description Hook de React para manejar la lógica y el estado de la lista de usuarios.
 */
export const useUsers = () => {
  const [users, setUsers] = useState<UserFromApi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * @name fetchUsers
   * @description Función para obtener la lista de usuarios desde el servicio y actualizar el estado.
   */
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userList = await userService.getUsers();
      setUsers(userList);
    } catch (err) {
      const errorMessage = 'Error al obtener la lista de usuarios';
      setError(errorMessage);
      console.error(errorMessage, err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * @name addUser
   * @description Agrega un nuevo usuario y actualiza la lista local.
   */
  const addUser = async (userData: UserFormData) => {
    try {
      await userService.createUser(userData);
      await fetchUsers(); // Recarga la lista para mostrar el nuevo usuario
    } catch (err) {
      console.error('Error al agregar el usuario:', err);
      throw err; 
    }
  };

  /**
   * @name editUser
   * @description Edita un usuario existente y actualiza la lista local.
   */
  const editUser = async (id: string, userData: Partial<UserFormData>) => {
    try {
      const updatedUser = await userService.updateUser(id, userData);
      setUsers(prevUsers =>
        prevUsers.map(user => (user.id === id ? { ...user, ...updatedUser } : user)),
      );
    } catch (err) {
      console.error('Error al editar el usuario:', err);
      throw err;
    }
  };

  /**
   * @name deleteUser
   * @description Elimina un usuario y recarga la lista desde el servidor para asegurar consistencia.
   * @param {string} id - ID del usuario a eliminar.
   */
  const deleteUser = async (id: string) => {
    try {
      // 1. Llama al servicio para eliminar el usuario en el backend.
      await userService.deleteUser(id);
      
      // 2. **LÓGICA CORREGIDA**: En lugar de filtrar el estado local,
      // volvemos a solicitar la lista completa al servidor.
      // Esto garantiza que la UI refleje el estado real de la base de datos.
      await fetchUsers();

    } catch (err) {
      const errorMessage = 'Error al eliminar el usuario';
      setError(errorMessage);
      console.error(errorMessage, err);
      throw err; // Relanza el error para que el componente muestre la alerta de error.
    }
  };
  
  const clearError = () => {
    setError(null);
  };


  return {
    users,
    loading,
    error,
    fetchUsers,
    addUser,
    editUser,
    deleteUser, // Exportamos con el nombre correcto
    clearError,
  };
};