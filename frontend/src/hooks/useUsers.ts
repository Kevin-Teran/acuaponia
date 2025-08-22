/**
 * @file useUsers.ts
 * @description Hook personalizado para gestionar la lógica de la página de usuarios.
 * Abstrae el estado, la carga, los errores y las operaciones de obtención y eliminación de usuarios.
 * @author kevin mariano
 * @version 2.1.0
 * @since 1.0.0
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserFromApi } from '@/types';
import { userService } from '@/services/userService';

/**
 * @typedef {object} UseUsersReturn
 * @description El objeto de retorno del hook useUsers.
 * @property {UserFromApi[]} users - La lista de usuarios.
 * @property {boolean} loading - Estado de carga.
 * @property {string | null} error - Mensaje de error, si lo hay.
 * @property {() => Promise<void>} fetchUsers - Función para recargar la lista de usuarios.
 * @property {(userId: string) => Promise<void>} deleteUser - Función para eliminar un usuario.
 */

/**
 * @function useUsers
 * @description Hook para manejar el estado y la lógica de la gestión de usuarios.
 * @returns {UseUsersReturn} Objeto con el estado y las funciones para interactuar con los usuarios.
 * @example
 * const { users, loading, error, deleteUser } = useUsers();
 */
export const useUsers = () => {
  const [users, setUsers] = useState<UserFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * @function fetchUsers
   * @description Obtiene los usuarios de la API y actualiza el estado del hook.
   * @private
   */
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedUsers = await userService.getUsers();
      setUsers(fetchedUsers);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'No se pudieron cargar los usuarios.';
      setError(errorMessage);
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /**
   * @function deleteUser
   * @description Elimina un usuario por su ID y actualiza el estado local.
   * @param {string} userId - El ID del usuario a eliminar.
   * @throws {Error} Relanza el error si la eliminación falla, para que el componente pueda manejarlo.
   */
  const deleteUser = useCallback(async (userId: string) => {
    try {
      await userService.deleteUser(userId);
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
    } catch (err: any) {
      console.error(`Error deleting user ${userId}:`, err);
      throw new Error(err.response?.data?.message || 'Error al eliminar el usuario.');
    }
  }, []);

  return { users, loading, error, fetchUsers, deleteUser };
};