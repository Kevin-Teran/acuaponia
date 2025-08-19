/**
 * @file useUsers.ts
 * @description Hook personalizado para gestionar el estado y las operaciones CRUD de los usuarios.
 * @technical_requirements Centraliza la lógica de fetching, estado de carga, errores y
 * las funciones para interactuar con el `userService`. Utiliza `useCallback` para memorizar
 * las funciones y evitar renderizados innecesarios en los componentes que lo consumen.
 */
 import { useState, useEffect, useCallback } from 'react';
 import { User } from '@/types';
 import * as userService from '@/services/userService';
 
 export const useUsers = () => {
   const [users, setUsers] = useState<User[]>([]);
   const [loading, setLoading] = useState<boolean>(true);
   const [error, setError] = useState<string | null>(null);
 
   /**
    * @function fetchUsers
    * @description Carga la lista de usuarios desde el backend y actualiza el estado.
    */
   const fetchUsers = useCallback(async () => {
     try {
       setLoading(true);
       setError(null);
       const fetchedUsers = await userService.getAllUsers();
       setUsers(fetchedUsers);
     } catch (err: any) {
       const errorMessage = err.response?.data?.message || 'No se pudieron cargar los usuarios.';
       setError(errorMessage);
       console.error(err);
     } finally {
       setLoading(false);
     }
   }, []);
 
   useEffect(() => {
     fetchUsers();
   }, [fetchUsers]);
 
   /**
    * @function addUser
    * @description Añade un nuevo usuario y actualiza la lista local.
    * @param {Partial<User>} userData - Datos del nuevo usuario.
    */
   const addUser = useCallback(async (userData: Partial<User>) => {
     const newUser = await userService.createUser(userData);
     setUsers(prevUsers => [newUser, ...prevUsers]);
   }, []);
 
   /**
    * @function updateUser
    * @description Actualiza un usuario existente y refresca la lista local.
    * @param {string} userId - ID del usuario a actualizar.
    * @param {Partial<User>} userData - Datos para actualizar.
    */
   const updateUser = useCallback(async (userId: string, userData: Partial<User>) => {
     const updatedUser = await userService.updateUser(userId, userData);
     setUsers(prevUsers =>
       prevUsers.map(u => (u.id === userId ? { ...u, ...updatedUser } : u))
     );
   }, []);
 
   /**
    * @function deleteUser
    * @description Elimina un usuario y lo quita de la lista local.
    * @param {string} userId - ID del usuario a eliminar.
    */
   const deleteUser = useCallback(async (userId: string) => {
     await userService.deleteUser(userId);
     setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
   }, []);
 
   return { users, loading, error, addUser, updateUser, deleteUser, refreshUsers: fetchUsers };
 };