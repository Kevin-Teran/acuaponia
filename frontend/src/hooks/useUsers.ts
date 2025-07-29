import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import * as userService from '../services/userService';

/**
 * @hook useUsers
 * @desc Hook personalizado para gestionar el estado y las operaciones CRUD de los usuarios.
 */
export const useUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const fetchedUsers = await userService.getUsers();
            setUsers(fetchedUsers);
            setError(null);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('No se pudieron cargar los usuarios.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const addUser = async (userData: Partial<User>): Promise<User | null> => {
        try {
            const newUser = await userService.createUser(userData);
            setUsers(prev => [newUser, ...prev]);
            return newUser;
        } catch (err) {
            console.error('Error creating user:', err);
            return null;
        }
    };

    const updateUser = async (id: string, userData: Partial<User>): Promise<User | null> => {
        try {
            const updatedUser = await userService.updateUser(id, userData);
            setUsers(prev => prev.map(user => (user.id === id ? updatedUser : user)));
            return updatedUser;
        } catch (err) {
            console.error('Error updating user:', err);
            return null;
        }
    };

    const deleteUser = async (id: string): Promise<boolean> => {
        try {
            await userService.deleteUser(id);
            setUsers(prev => prev.filter(user => user.id !== id));
            return true;
        } catch (err) {
            console.error('Error deleting user:', err);
            return false;
        }
    };

    return {
        users,
        loading,
        error,
        addUser,
        updateUser,
        deleteUser,
    };
};