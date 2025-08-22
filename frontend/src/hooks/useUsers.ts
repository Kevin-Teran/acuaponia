/**
 * @file useUsers.ts
 * @description Hook personalizado para gestionar la lógica de la página de usuarios.
 * @author kevin mariano
 * @version 2.0.0
 * @since 1.0.0
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserFromApi } from '@/types';
import { userService } from '@/services/userService';

export const useUsers = () => {
  const [users, setUsers] = useState<UserFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Llamada a la función corregida
      const fetchedUsers = await userService.getUsers();
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
      setUsers((prevUsers) => prevUsers.filter((user) => user.id !== userId));
    } catch (err: any) {
      console.error(`Error deleting user ${userId}:`, err);
      throw err;
    }
  }, []);

  return { users, loading, error, fetchUsers, deleteUser };
};