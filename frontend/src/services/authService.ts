/**
 * @file authService.ts
 * @description Servicio para gestionar todas las operaciones de autenticación.
 * Se comunica con la API para iniciar sesión, cerrar sesión y verificar el estado
 * de la sesión. También maneja la persistencia del usuario en localStorage.
 */

import { api } from '@/config/api'; // Usamos la exportación nombrada consistente
import { User, LoginCredentials } from '@/types';

/**
 * Inicia sesión de un usuario enviando las credenciales al backend.
 * Si tiene éxito, almacena los datos del usuario en localStorage.
 * Si falla, limpia cualquier sesión local previa y lanza un error.
 *
 * @param {LoginCredentials} credentials - Objeto con el email y la contraseña del usuario.
 * @returns {Promise<User>} Una promesa que resuelve con los datos del usuario autenticado.
 * @throws {Error} Lanza un error con un mensaje amigable si la autenticación falla.
 */
export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    const response = await api.post('/auth/login', credentials);
    const user: User = response.data;

    // Solo ejecutar en el lado del cliente
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    return user;
  } catch (error: any) {
    // Para depuración, muestra el error real del backend en la consola del desarrollador.
    console.error('Error detallado de la API en login:', error.response?.data || error.message);
    
    // Asegura que no queden datos de una sesión anterior si el login falla.
    logout();
    
    // Lanza un error claro que el componente de UI puede mostrar al usuario.
    throw new Error(error.response?.data?.message || 'Error de autenticación. Verifique sus credenciales.');
  }
};

/**
 * Cierra la sesión del usuario.
 * Elimina los datos del usuario de localStorage y realiza una petición al backend
 * para invalidar la sesión/cookie en el servidor.
 */
export const logout = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
    
    // Notifica al backend que cierre la sesión. Es una operación de "disparar y olvidar".
    // No bloqueamos el logout del cliente si esta llamada falla, ya que la sesión local ya está limpia.
    api.post('/auth/logout').catch(err => {
      console.warn("La llamada a la API de logout falló (puede ser normal si la sesión ya expiró):", err);
    });
  }
};

/**
 * Obtiene síncronamente los datos del usuario actual desde localStorage.
 * Es útil para inicializar el estado de la aplicación sin esperar una llamada a la API.
 * Devuelve null si no hay usuario o si ocurre un error al parsear los datos.
 *
 * @returns {User | null} El objeto del usuario o null si no se encuentra.
 */
export const getCurrentUser = (): User | null => {
  // Previene errores durante el Server-Side Rendering (SSR)
  if (typeof window === 'undefined') {
    return null;
  }
  
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    return null;
  }

  try {
    return JSON.parse(userStr) as User;
  } catch (error) {
    console.error("No se pudo parsear el usuario desde localStorage, limpiando...", error);
    // Si los datos están corruptos, los eliminamos.
    localStorage.removeItem('user');
    return null;
  }
};

/**
 * Verifica la validez de la sesión actual contra el backend.
 * Esta es la forma más segura de confirmar si un usuario está realmente autenticado,
 * ya que valida la cookie httpOnly con el servidor.
 * Si tiene éxito, actualiza los datos del usuario en localStorage.
 * Si falla, limpia la sesión local.
 *
 * @returns {Promise<User>} Una promesa que resuelve con los datos del usuario si la sesión es válida.
 * @throws {Error} Lanza un error si la sesión no es válida o la petición falla.
 */
export const checkSession = async (): Promise<User> => {
  try {
    // Esta ruta debe estar protegida en el backend y devolver los datos del usuario logueado.
    const response = await api.get('/auth/profile');
    const user: User = response.data;

    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    return user;
  } catch (error) {
    // Si la verificación de sesión falla, es una señal definitiva de que no estamos autenticados.
    // Limpiamos cualquier dato local para evitar inconsistencias.
    logout();
    throw new Error('La sesión no es válida o ha expirado.');
  }
};