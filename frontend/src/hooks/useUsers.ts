/**
 * @file useUsers.ts
 * @description Hook personalizado para gestionar la lógica de la página de usuarios.
 */
 'use client';

 import { useState, useEffect, useCallback } from 'react';
 import { UserFromApi } from '@/types';
 import * as userService from '@/services/userService';
 
 export const useUsers = () => {
   const [users, setUsers] = useState<UserFromApi[]>([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
 
   const fetchUsers = useCallback(async () => {
     try {
       setLoading(true);
       setError(null);
       const fetchedUsers = await userService.getAllUsers();
       setUsers(fetchedUsers);
     } catch (err: any) {
       setError(err.message || 'No se pudieron cargar los usuarios.');
       console.error("Error fetching users:", err);
     } finally {
       setLoading(false);
     }
   }, []);
 
   useEffect(() => {
     fetchUsers();
   }, [fetchUsers]);
 
   const deleteUser = useCallback(async (userId: string) => {
     try {
       await userService.deleteUser(userId);
       // Actualizar el estado local para reflejar la eliminación
       setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
     } catch (err: any) {
       console.error(`Error deleting user ${userId}:`, err);
       throw err; // Re-lanzar el error para que el componente lo maneje
     }
   }, []);
 
   // Aquí se podrían añadir más funciones como createUser, updateUser, etc.
 
   return { users, loading, error, fetchUsers, deleteUser };
 };