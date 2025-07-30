import { useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import * as userService from '../services/userService';

/**
 * @hook useUsers
 * @desc Hook personalizado para gestionar el estado y las operaciones CRUD de los usuarios.
 * Proporciona una interfaz limpia para que los componentes interactúen con los datos de los usuarios.
 */
export const useUsers = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * @desc Función para cargar o recargar la lista de usuarios desde el backend.
     */
    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const fetchedUsers = await userService.getUsers();
            setUsers(fetchedUsers);
            setError(null);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError('No se pudieron cargar los usuarios. Verifique la conexión con el servidor.');
        } finally {
            setLoading(false);
        }
    }, []);

    // Carga inicial de datos cuando el hook se monta por primera vez.
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    /**
     * @desc Añade un nuevo usuario y actualiza el estado local.
     * @param {Partial<User>} userData - Datos del nuevo usuario.
     * @returns {Promise<User | null>} El usuario creado o null si hubo un error.
     */
    const addUser = async (userData: Partial<User>): Promise<User | null> => {
        try {
            const newUser = await userService.createUser(userData);
            setUsers(prev => [newUser, ...prev]); // Añade el nuevo usuario al principio de la lista
            return newUser;
        } catch (err) {
            console.error('Error creating user:', err);
            throw err; // Lanza el error para que el componente pueda manejarlo
        }
    };

    /**
     * @desc Actualiza un usuario existente y actualiza el estado local.
     * @param {string} id - ID del usuario a actualizar.
     * @param {Partial<User>} userData - Nuevos datos del usuario.
     * @returns {Promise<User | null>} El usuario actualizado o null si hubo un error.
     */
    const updateUser = async (id: string, userData: Partial<User>): Promise<User | null> => {
        try {
            const updatedUser = await userService.updateUser(id, userData);
            setUsers(prev => prev.map(user => (user.id === id ? updatedUser : user)));
            return updatedUser;
        } catch (err) {
            console.error('Error updating user:', err);
            throw err;
        }
    };

    /**
     * @desc Elimina un usuario y lo quita del estado local.
     * @param {string} id - ID del usuario a eliminar.
     * @returns {Promise<boolean>} `true` si se eliminó correctamente, `false` si no.
     */
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
        fetchUsers, 
        addUser,
        updateUser,
        deleteUser,
    };
};