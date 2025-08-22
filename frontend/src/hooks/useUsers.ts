/**
 * @file useUsers.ts
 * @description Hook personalizado para la gestión del estado de los usuarios en la UI.
 * Proporciona lógica para obtener, agregar, editar y eliminar usuarios.
 * @author Kevin Mariano
 * @version 1.1.0
 * @since 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { userService } from '../services/userService';
import { User } from '../types';

/**
 * @typedef {Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password?: string }} UserFormData
 * @description Define la estructura de los datos del formulario para crear o editar un usuario.
 */
export type UserFormData = Omit<User, 'id' | 'createdAt' | 'updatedAt'> & {
  password?: string;
};

/**
 * @function useUsers
 * @description Hook de React para manejar la lógica y el estado de la lista de usuarios.
 * @returns {{
 * users: User[];
 * loading: boolean;
 * error: string | null;
 * fetchUsers: () => Promise<void>;
 * addUser: (userData: UserFormData) => Promise<void>;
 * editUser: (id: string, userData: Partial<UserFormData>) => Promise<void>;
 * removeUser: (id: string) => Promise<void>;
 * }}
 * Un objeto que contiene el estado de los usuarios (lista, carga, error) y las funciones para manipularlos.
 *
 * @example
 * const { users, loading, error, removeUser } = useUsers();
 *
 * if (loading) return <p>Cargando...</p>;
 * if (error) return <p>Error: {error}</p>;
 *
 * return (
 * <ul>
 * {users.map(user => (
 * <li key={user.id}>
 * {user.name} <button onClick={() => removeUser(user.id)}>Eliminar</button>
 * </li>
 * ))}
 * </ul>
 * );
 */
export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * @name fetchUsers
   * @description Función para obtener la lista de usuarios desde el servicio y actualizar el estado.
   * Es memorizada con `useCallback` para evitar re-creaciones innecesarias.
   */
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const userList = await userService.getUsers();
      setUsers(userList);
    } catch (err) {
      setError('Error al obtener la lista de usuarios');
      console.error(err);
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
   * @param {UserFormData} userData - Datos del nuevo usuario.
   */
  const addUser = async (userData: UserFormData) => {
    try {
      const newUser = await userService.createUser(userData);
      setUsers(prevUsers => [...prevUsers, newUser]);
    } catch (err) {
      setError('Error al agregar el usuario');
      console.error(err);
      throw err; // Relanza el error para que el componente pueda manejarlo (e.g., mostrar notificación)
    }
  };

  /**
   * @name editUser
   * @description Edita un usuario existente y actualiza la lista local.
   * @param {string} id - ID del usuario a editar.
   * @param {Partial<UserFormData>} userData - Nuevos datos para el usuario.
   */
  const editUser = async (id: string, userData: Partial<UserFormData>) => {
    try {
      const updatedUser = await userService.updateUser(id, userData);
      setUsers(prevUsers =>
        prevUsers.map(user => (user.id === id ? updatedUser : user)),
      );
    } catch (err) {
      setError('Error al editar el usuario');
      console.error(err);
      throw err;
    }
  };

  /**
   * @name removeUser
   * @description Elimina un usuario y lo quita de la lista local.
   * @param {string} id - ID del usuario a eliminar.
   */
  const removeUser = async (id: string) => {
    try {
      await userService.deleteUser(id);
      setUsers(prevUsers => prevUsers.filter(user => user.id !== id));
    } catch (err) {
      setError('Error al eliminar el usuario');
      console.error(err);
      throw err;
    }
  };

  return {
    users,
    loading,
    error,
    fetchUsers,
    addUser,
    editUser,
    removeUser,
  };
};