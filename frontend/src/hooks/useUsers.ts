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
            setError(null);
            const fetchedUsers = await userService.getUsers();
            setUsers(fetchedUsers);
        } catch (err: any) {
            console.error('Error fetching users:', err);
            
            let errorMessage = 'No se pudieron cargar los usuarios.';
            
            if (err.response?.status === 401) {
                errorMessage = 'No tienes permisos para ver los usuarios.';
            } else if (err.response?.status === 403) {
                errorMessage = 'Acceso denegado. Se requiere rol de administrador.';
            } else if (err.response?.status >= 500) {
                errorMessage = 'Error del servidor. Inténtalo de nuevo más tarde.';
            } else if (err.code === 'ECONNABORTED') {
                errorMessage = 'Tiempo de espera agotado. Verifica tu conexión.';
            } else if (!err.response) {
                errorMessage = 'Error de conexión. Verifica que el servidor esté funcionando.';
            }
            
            setError(errorMessage);
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
        } catch (err: any) {
            console.error('Error creating user:', err);
            
            // Mejorar el manejo de errores específicos
            if (err.response?.status === 409) {
                // Error de email duplicado - ya se maneja en el componente
                throw err;
            } else if (err.response?.status === 400) {
                // Error de validación
                const message = err.response.data?.error?.message || 'Datos inválidos';
                throw new Error(message);
            } else if (err.response?.status === 401 || err.response?.status === 403) {
                throw new Error('No tienes permisos para crear usuarios');
            } else if (err.response?.status >= 500) {
                throw new Error('Error del servidor. Inténtalo de nuevo más tarde.');
            } else if (!err.response) {
                throw new Error('Error de conexión. Verifica que el servidor esté funcionando.');
            }
            
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
        } catch (err: any) {
            console.error('Error updating user:', err);
            
            if (err.response?.status === 404) {
                throw new Error('Usuario no encontrado');
            } else if (err.response?.status === 409) {
                // Error de email duplicado
                throw err;
            } else if (err.response?.status === 403) {
                throw new Error('No tienes permisos para actualizar este usuario');
            } else if (err.response?.status === 400) {
                const message = err.response.data?.error?.message || 'Datos inválidos';
                throw new Error(message);
            } else if (err.response?.status >= 500) {
                throw new Error('Error del servidor. Inténtalo de nuevo más tarde.');
            } else if (!err.response) {
                throw new Error('Error de conexión. Verifica que el servidor esté funcionando.');
            }
            
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
        } catch (err: any) {
            console.error('Error deleting user:', err);
            
            if (err.response?.status === 404) {
                // El usuario ya no existe, podemos considerarlo como eliminado
                setUsers(prev => prev.filter(user => user.id !== id));
                return true;
            } else if (err.response?.status === 403) {
                console.error('No tienes permisos para eliminar este usuario');
            } else if (err.response?.status >= 500) {
                console.error('Error del servidor al eliminar usuario');
            } else if (!err.response) {
                console.error('Error de conexión al eliminar usuario');
            }
            
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