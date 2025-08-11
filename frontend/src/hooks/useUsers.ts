import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import * as userService from '../services/userService';

/**
 * @hook useUsers
 * @desc Hook personalizado para gestionar el estado y las operaciones CRUD de los usuarios.
 * Ahora actúa como un simple conector entre la UI y los servicios de API.
 */
export const useUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * @desc Carga la lista de usuarios desde el backend.
     */
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const fetchedUsers = await userService.getUsers();
            setUsers(fetchedUsers);
        } catch (err: any) {
            console.error('Error al obtener usuarios:', err);
            const errorMessage = err.response?.data?.message || 'No se pudieron cargar los usuarios. Verifique la conexión con el servidor.';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    /**
     * @desc Llama al servicio para añadir un nuevo usuario y recarga la lista.
     */
    const addUser = async (userData: Partial<User>): Promise<void> => {
        await userService.createUser(userData);
        await fetchUsers(); 
    };

    /**
     * @desc Llama al servicio para actualizar un usuario y recarga la lista.
     */
    const updateUser = async (id: string, userData: Partial<User>): Promise<void> => {
        await userService.updateUser(id, userData);
        await fetchUsers(); 
    };

    /**
     * @desc Llama al servicio para eliminar un usuario y lo quita del estado local.
     */
    const deleteUser = async (id: string): Promise<void> => {
        await userService.deleteUser(id);
        setUsers(prev => prev.filter(user => user.id !== id)); 
    };

    return {
        users,
        loading,
        error,
        fetchUsers, 
        addUser,
        updateUser,
        deleteUser,
    };
};