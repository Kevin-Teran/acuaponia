/**
 * @file useUsers.ts
 * @description Hook personalizado para gestionar la lógica completa de la página de usuarios.
 * Abstrae el estado, la carga, los errores y todas las operaciones CRUD de usuarios.
 * Proporciona una interfaz consistente y reactiva para componentes que manejan usuarios.
 * @author kevin mariano
 * @version 3.0.0
 * @since 1.0.0
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { UserFromApi, User, CreateUserDto, UpdateUserDto } from '@/types';
import { userService } from '@/services/userService';

/**
 * @typedef {object} UseUsersState
 * @description Estado interno del hook con todas las propiedades de gestión de usuarios.
 * @property {UserFromApi[]} users - Lista completa de usuarios con estadísticas
 * @property {boolean} loading - Indica si hay una operación de carga en progreso
 * @property {string | null} error - Mensaje de error actual, null si no hay errores
 * @property {boolean} creating - Indica si se está creando un usuario
 * @property {boolean} updating - Indica si se está actualizando un usuario
 * @property {boolean} deleting - Indica si se está eliminando un usuario
 */

/**
 * @typedef {object} UseUsersActions
 * @description Acciones disponibles para manipular usuarios desde el hook.
 * @property {() => Promise<void>} fetchUsers - Recarga la lista de usuarios desde la API
 * @property {(userData: CreateUserDto) => Promise<User>} createUser - Crea un nuevo usuario
 * @property {(id: string, userData: UpdateUserDto) => Promise<User>} updateUser - Actualiza un usuario existente
 * @property {(userId: string) => Promise<void>} deleteUser - Elimina un usuario por su ID
 * @property {() => void} clearError - Limpia el estado de error actual
 * @property {(searchTerm: string) => UserFromApi[]} filterUsers - Filtra usuarios por término de búsqueda
 */

/**
 * @typedef {object} UseUsersReturn
 * @description Objeto completo de retorno del hook useUsers.
 * @extends UseUsersState
 * @extends UseUsersActions
 * @example
 * const {
 *   users,
 *   loading,
 *   error,
 *   creating,
 *   fetchUsers,
 *   createUser,
 *   updateUser,
 *   deleteUser,
 *   clearError
 * } = useUsers();
 */
type UseUsersReturn = {
  // Estado
  users: UserFromApi[];
  loading: boolean;
  error: string | null;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  // Acciones
  fetchUsers: () => Promise<void>;
  createUser: (userData: CreateUserDto) => Promise<User>;
  updateUser: (id: string, userData: UpdateUserDto) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  clearError: () => void;
  filterUsers: (searchTerm: string) => UserFromApi[];
};

/**
 * @function useUsers
 * @description Hook personalizado para manejar completamente el estado y las operaciones de usuarios.
 * Proporciona carga automática inicial, manejo de errores, estados de loading específicos y
 * funciones optimizadas para todas las operaciones CRUD.
 * @returns {UseUsersReturn} Objeto con el estado completo y las funciones para interactuar con usuarios
 * @example
 * // En un componente de gestión de usuarios
 * function UserManagementPage() {
 *   const {
 *     users,
 *     loading,
 *     error,
 *     creating,
 *     deleteUser,
 *     clearError
 *   } = useUsers();
 * 
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage message={error} onClear={clearError} />;
 * 
 *   return (
 *     <div>
 *       {users.map(user => (
 *         <UserCard
 *           key={user.id}
 *           user={user}
 *           onDelete={() => deleteUser(user.id)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 */
export const useUsers = (): UseUsersReturn => {
  // Estados principales
  const [users, setUsers] = useState<UserFromApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de operaciones específicas
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /**
   * @method fetchUsers
   * @description Obtiene la lista completa de usuarios de la API y actualiza el estado del hook.
   * Incluye manejo de errores robusto y limpieza de estados previos.
   * @async
   * @returns {Promise<void>} Promesa que resuelve cuando la carga está completa
   * @throws {Error} Los errores se capturan y se almacenan en el estado error
   * @example
   * // Recargar usuarios después de una operación
   * const handleRefresh = async () => {
   *   try {
   *     await fetchUsers();
   *     console.log('Lista de usuarios actualizada');
   *   } catch (error) {
   *     console.error('Error al recargar:', error);
   *   }
   * };
   */
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const fetchedUsers = await userService.getUsers();
      
      // Validación adicional de los datos recibidos
      if (!Array.isArray(fetchedUsers)) {
        throw new Error('Datos de usuarios inválidos recibidos del servidor');
      }
      
      setUsers(fetchedUsers);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'No se pudieron cargar los usuarios. Por favor, intenta nuevamente.';
      setError(errorMessage);
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * @method createUser
   * @description Crea un nuevo usuario y actualiza automáticamente la lista local.
   * Maneja estados de loading específicos y validaciones previas al envío.
   * @async
   * @param {CreateUserDto} userData - Datos del usuario a crear, validados por el DTO
   * @returns {Promise<User>} Promesa que resuelve al usuario creado
   * @throws {Error} Relanza errores para que el componente pueda manejarlos
   * @example
   * const handleCreateUser = async (formData) => {
   *   try {
   *     setCreating(true);
   *     const newUser = await createUser({
   *       name: formData.name,
   *       email: formData.email,
   *       password: formData.password,
   *       role: formData.role
   *     });
   *     console.log(`Usuario creado: ${newUser.name}`);
   *   } catch (error) {
   *     console.error('Error en creación:', error.message);
   *   }
   * };
   */
  const createUser = useCallback(async (userData: CreateUserDto): Promise<User> => {
    try {
      setCreating(true);
      setError(null);
      
      const newUser = await userService.createUser(userData);
      
      // Actualización optimista: agregar el usuario a la lista local
      const userWithCount = {
        ...newUser,
        _count: { tanks: 0 }, // Usuario nuevo no tiene tanques
      } as UserFromApi;
      
      setUsers(prevUsers => [userWithCount, ...prevUsers]);
      
      return newUser;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Error al crear el usuario';
      setError(errorMessage);
      console.error(`Error creating user:`, err);
      throw new Error(errorMessage);
    } finally {
      setCreating(false);
    }
  }, []);

  /**
   * @method updateUser
   * @description Actualiza un usuario existente y sincroniza la lista local.
   * Implementa actualización optimista para mejor experiencia de usuario.
   * @async
   * @param {string} id - Identificador único del usuario a actualizar
   * @param {UpdateUserDto} userData - Datos parciales a actualizar
   * @returns {Promise<User>} Promesa que resuelve al usuario actualizado
   * @throws {Error} Relanza errores para manejo en el componente
   * @example
   * const handleUpdateUser = async (userId, changes) => {
   *   try {
   *     const updated = await updateUser(userId, changes);
   *     console.log(`Usuario actualizado: ${updated.name}`);
   *   } catch (error) {
   *     console.error('Error en actualización:', error.message);
   *   }
   * };
   */
  const updateUser = useCallback(async (id: string, userData: UpdateUserDto): Promise<User> => {
    try {
      setUpdating(true);
      setError(null);
      
      const updatedUser = await userService.updateUser(id, userData);
      
      // Actualización optimista de la lista local
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.id === id) {
            return {
              ...user,
              ...updatedUser,
              // Mantener el conteo de tanques si no se proporciona
              _count: user._count,
            } as UserFromApi;
          }
          return user;
        })
      );
      
      return updatedUser;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Error al actualizar el usuario';
      setError(errorMessage);
      console.error(`Error updating user ${id}:`, err);
      throw new Error(errorMessage);
    } finally {
      setUpdating(false);
    }
  }, []);

  /**
   * @method deleteUser
   * @description Elimina un usuario por su ID y actualiza automáticamente la lista local.
   * Implementa eliminación optimista con rollback en caso de error.
   * @async
   * @param {string} userId - El identificador único del usuario a eliminar
   * @returns {Promise<void>} Promesa que resuelve cuando la eliminación es exitosa
   * @throws {Error} Relanza el error para que el componente pueda manejarlo con UI específico
   * @example
   * const handleDeleteUser = async (userId, userName) => {
   *   if (window.confirm(`¿Eliminar a ${userName}?`)) {
   *     try {
   *       await deleteUser(userId);
   *       console.log('Usuario eliminado exitosamente');
   *     } catch (error) {
   *       console.error('Error al eliminar:', error.message);
   *     }
   *   }
   * };
   */
  const deleteUser = useCallback(async (userId: string): Promise<void> => {
    // Backup del estado actual para rollback
    const previousUsers = users;
    
    try {
      setDeleting(true);
      setError(null);
      
      // Eliminación optimista: remover de la lista local inmediatamente
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      
      // Llamada a la API
      await userService.deleteUser(userId);
      
    } catch (err: any) {
      // Rollback: restaurar el estado anterior en caso de error
      setUsers(previousUsers);
      
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Error al eliminar el usuario';
      setError(errorMessage);
      console.error(`Error deleting user ${userId}:`, err);
      throw new Error(errorMessage);
    } finally {
      setDeleting(false);
    }
  }, [users]);

  /**
   * @method clearError
   * @description Limpia el estado de error actual. Útil para cerrar mensajes de error en la UI.
   * @returns {void}
   * @example
   * // En un componente con mensaje de error
   * {error && (
   *   <ErrorAlert 
   *     message={error} 
   *     onClose={clearError} 
   *   />
   * )}
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * @method filterUsers
   * @description Filtra la lista de usuarios basado en un término de búsqueda.
   * Busca en nombre, email y rol del usuario de forma case-insensitive.
   * @param {string} searchTerm - Término de búsqueda para filtrar usuarios
   * @returns {UserFromApi[]} Array de usuarios que coinciden con el término de búsqueda
   * @example
   * // En un componente con barra de búsqueda
   * const [searchTerm, setSearchTerm] = useState('');
   * const filteredUsers = filterUsers(searchTerm);
   * 
   * return (
   *   <div>
   *     <input 
   *       value={searchTerm}
   *       onChange={(e) => setSearchTerm(e.target.value)}
   *       placeholder="Buscar usuarios..."
   *     />
   *     {filteredUsers.map(user => <UserCard key={user.id} user={user} />)}
   *   </div>
   * );
   */
  const filterUsers = useCallback((searchTerm: string): UserFromApi[] => {
    if (!searchTerm.trim()) {
      return users;
    }

    const term = searchTerm.toLowerCase().trim();
    
    return users.filter(user => 
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.role.toLowerCase().includes(term) ||
      user.status.toLowerCase().includes(term)
    );
  }, [users]);

  /**
   * @method useEffect - Carga inicial
   * @description Effect que se ejecuta al montar el hook para cargar la lista inicial de usuarios.
   * @private
   */
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    creating,
    updating,
    deleting,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    clearError,
    filterUsers,
  };
};