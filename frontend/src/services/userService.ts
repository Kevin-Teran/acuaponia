/**
 * @file userService.ts
 * @description Servicio para gestionar las operaciones CRUD de usuarios desde el frontend.
 * Proporciona una capa de abstracción entre los componentes y la API REST del backend.
 * @author kevin mariano
 * @version 3.0.0
 * @since 1.0.0
 */

import api from '@/config/api';
import { User, CreateUserDto, UpdateUserDto, UserFromApi } from '@/types';

/**
 * @typedef {object} UserServiceResponse
 * @description Estructura de respuesta estándar de la API para operaciones de usuarios.
 * @property {boolean} success - Indica si la operación fue exitosa
 * @property {string} message - Mensaje descriptivo del resultado
 * @property {User | User[]} data - Los datos del usuario o usuarios
 */

/**
 * @namespace userService
 * @description Conjunto de funciones para interactuar con la API de usuarios.
 * Todas las funciones incluyen manejo de errores y validaciones básicas.
 */

/**
 * @function getUsers
 * @description Obtiene la lista completa de usuarios desde la API del backend.
 * Solo disponible para usuarios con rol de administrador. Incluye información estadística.
 * @async
 * @returns {Promise<UserFromApi[]>} Promesa que resuelve a un array de usuarios con estadísticas
 * @throws {Error} Si la petición falla, no hay permisos o hay problemas de conectividad
 * @example
 * try {
 *   const users = await userService.getUsers();
 *   console.log(`Total de usuarios: ${users.length}`);
 *   
 *   users.forEach(user => {
 *     console.log(`${user.name} - ${user.role} - ${user._count.tanks} tanques`);
 *   });
 * } catch (error) {
 *   if (error.response?.status === 403) {
 *     console.error('Sin permisos para ver la lista de usuarios');
 *   } else {
 *     console.error('Error al cargar usuarios:', error.message);
 *   }
 * }
 */
const getUsers = async (): Promise<UserFromApi[]> => {
  try {
    const response = await api.get<UserFromApi[]>('/users');
    
    if (!Array.isArray(response.data)) {
      throw new Error('Respuesta inválida del servidor: se esperaba un array');
    }
    
    return response.data;
  } catch (error: any) {
    console.error('Error en getUsers:', error);
    
    if (error.response?.status === 403) {
      throw new Error('No tienes permisos para acceder a la lista de usuarios');
    } else if (error.response?.status === 401) {
      throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente');
    } else if (error.response?.status >= 500) {
      throw new Error('Error del servidor. Por favor, intenta más tarde');
    } else {
      throw new Error(error.response?.data?.message || 'Error al obtener la lista de usuarios');
    }
  }
};

/**
 * @function getUserById
 * @description Obtiene los detalles completos de un usuario específico por su identificador único.
 * @async
 * @param {string} id - El identificador UUID del usuario a consultar
 * @returns {Promise<User>} Promesa que resuelve a los datos completos del usuario
 * @throws {Error} Si el usuario no existe, no hay permisos o el ID es inválido
 * @example
 * try {
 *   const user = await userService.getUserById('clx5e2r9s0000a1b2c3d4e5f6');
 *   console.log(`Usuario: ${user.name} (${user.email})`);
 *   console.log(`Rol: ${user.role}, Estado: ${user.status}`);
 * } catch (error) {
 *   if (error.message.includes('no encontrado')) {
 *     console.error('El usuario no existe o fue eliminado');
 *   }
 * }
 */
const getUserById = async (id: string): Promise<User> => {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID de usuario inválido');
  }

  try {
    const response = await api.get<User>(`/users/${id.trim()}`);
    return response.data;
  } catch (error: any) {
    console.error(`Error en getUserById para ID ${id}:`, error);
    
    if (error.response?.status === 404) {
      throw new Error(`Usuario con ID ${id} no encontrado`);
    } else if (error.response?.status === 403) {
      throw new Error('No tienes permisos para ver los detalles de este usuario');
    } else {
      throw new Error(error.response?.data?.message || 'Error al obtener los datos del usuario');
    }
  }
};

/**
 * @function createUser
 * @description Crea un nuevo usuario en el sistema con los datos proporcionados.
 * Solo disponible para administradores. Valida datos antes del envío.
 * @async
 * @param {CreateUserDto} userData - Objeto con los datos del nuevo usuario validados
 * @returns {Promise<User>} Promesa que resuelve al usuario creado (sin contraseña)
 * @throws {Error} Si los datos son inválidos, el email ya existe o no hay permisos
 * @example
 * const newUserData = {
 *   name: 'Carlos Rodríguez',
 *   email: 'carlos.rodriguez@acuaponia.com',
 *   password: 'password123',
 *   role: Role.USER,
 *   status: 'ACTIVE'
 * };
 * 
 * try {
 *   const createdUser = await userService.createUser(newUserData);
 *   console.log(`Usuario creado exitosamente: ${createdUser.name}`);
 *   return createdUser;
 * } catch (error) {
 *   if (error.message.includes('ya está registrado')) {
 *     console.error('El email ya existe en el sistema');
 *   }
 * }
 */
const createUser = async (userData: CreateUserDto): Promise<User> => {
  if (!userData.name?.trim()) {
    throw new Error('El nombre del usuario es obligatorio');
  }
  
  if (!userData.email?.trim()) {
    throw new Error('El email del usuario es obligatorio');
  }
  
  if (!userData.password || userData.password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  try {
    const response = await api.post<User>('/users', {
      ...userData,
      name: userData.name.trim(),
      email: userData.email.toLowerCase().trim(),
    });
    
    return response.data;
  } catch (error: any) {
    console.error('Error en createUser:', error);
    
    if (error.response?.status === 409) {
      throw new Error('El correo electrónico ya está registrado en el sistema');
    } else if (error.response?.status === 403) {
      throw new Error('No tienes permisos para crear usuarios');
    } else if (error.response?.status === 400) {
      throw new Error(error.response.data?.message || 'Datos de usuario inválidos');
    } else {
      throw new Error('Error al crear el usuario. Por favor, intenta nuevamente');
    }
  }
};

/**
 * @function updateUser
 * @description Actualiza los datos de un usuario existente con validaciones de autorización.
 * Los administradores pueden actualizar cualquier usuario, los usuarios regulares solo a sí mismos.
 * @async
 * @param {string} id - El identificador único del usuario a actualizar
 * @param {UpdateUserDto} userData - Objeto con los datos parciales a actualizar
 * @returns {Promise<User>} Promesa que resuelve al usuario actualizado (sin contraseña)
 * @throws {Error} Si el usuario no existe, no hay permisos o los datos son inválidos
 * @example
 * const updateData = {
 *   name: 'Carlos Rodríguez Senior',
 *   role: Role.ADMIN
 * };
 * 
 * try {
 *   const updatedUser = await userService.updateUser('user-id', updateData);
 *   console.log(`Usuario actualizado: ${updatedUser.name} - ${updatedUser.role}`);
 * } catch (error) {
 *   if (error.response?.status === 409) {
 *     console.error('El nuevo email ya está en uso');
 *   }
 * }
 */
const updateUser = async (id: string, userData: UpdateUserDto): Promise<User> => {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID de usuario inválido para actualización');
  }

  if (userData.email && !userData.email.trim()) {
    throw new Error('El email no puede estar vacío');
  }

  if (userData.password && userData.password.length < 6) {
    throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
  }

  try {
    const cleanedData: UpdateUserDto = { ...userData };
    
    if (cleanedData.name) cleanedData.name = cleanedData.name.trim();
    if (cleanedData.email) cleanedData.email = cleanedData.email.toLowerCase().trim();

    const response = await api.put<User>(`/users/${id.trim()}`, cleanedData);
    return response.data;
  } catch (error: any) {
    console.error(`Error en updateUser para ID ${id}:`, error);
    
    if (error.response?.status === 404) {
      throw new Error('Usuario no encontrado para actualización');
    } else if (error.response?.status === 403) {
      throw new Error('No tienes permisos para actualizar este usuario');
    } else if (error.response?.status === 409) {
      throw new Error('El nuevo email ya está en uso por otro usuario');
    } else if (error.response?.status === 400) {
      throw new Error(error.response.data?.message || 'Datos de actualización inválidos');
    } else {
      throw new Error('Error al actualizar el usuario. Por favor, intenta nuevamente');
    }
  }
};

/**
 * @function deleteUser
 * @description Elimina permanentemente un usuario del sistema con todas sus relaciones.
 * Solo administradores pueden eliminar usuarios, con restricciones para auto-eliminación.
 * @async
 * @param {string} id - El identificador único del usuario a eliminar
 * @returns {Promise<void>} Promesa que resuelve cuando la eliminación es exitosa
 * @throws {Error} Si el usuario no existe, no hay permisos o se intenta auto-eliminación
 * @example
 * try {
 *   await userService.deleteUser('clx5e2r9s0000a1b2c3d4e5f6');
 *   console.log('Usuario eliminado exitosamente');
 *   
 *   // Actualizar lista de usuarios en el componente
 *   await refreshUserList();
 * } catch (error) {
 *   if (error.message.includes('eliminarse a sí mismo')) {
 *     console.error('No puedes eliminar tu propia cuenta');
 *   } else {
 *     console.error('Error al eliminar usuario:', error.message);
 *   }
 * }
 */
const deleteUser = async (id: string): Promise<void> => {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('ID de usuario inválido para eliminación');
  }

  try {
    await api.delete(`/users/${id.trim()}`);
  } catch (error: any) {
    console.error(`Error en deleteUser para ID ${id}:`, error);
    
    if (error.response?.status === 404) {
      throw new Error('Usuario no encontrado para eliminación');
    } else if (error.response?.status === 403) {
      const message = error.response.data?.message || 'No tienes permisos para eliminar usuarios';
      
      if (message.includes('eliminarse a sí mismo')) {
        throw new Error('No puedes eliminar tu propia cuenta de administrador');
      } else if (message.includes('último administrador')) {
        throw new Error('No se puede eliminar el último administrador del sistema');
      } else {
        throw new Error(message);
      }
    } else {
      throw new Error('Error al eliminar el usuario. Por favor, intenta nuevamente');
    }
  }
};

/**
 * @constant {object} userService
 * @description Objeto que exporta todas las funciones del servicio de usuarios.
 * Proporciona una interfaz consistente para todas las operaciones CRUD.
 * @example
 * import { userService } from '@/services/userService';
 * 
 * // Usar cualquiera de las funciones disponibles
 * const users = await userService.getUsers();
 * const user = await userService.getUserById('some-id');
 * const newUser = await userService.createUser(userData);
 * const updated = await userService.updateUser('id', updateData);
 * await userService.deleteUser('id');
 */
export const userService = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};