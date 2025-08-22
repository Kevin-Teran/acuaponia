/**
 * @file authService.ts
 * @description Servicio para gestionar las operaciones de autenticación con la API.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 */

import api from '@/config/api';

/**
 * @function login
 * @description Envía las credenciales del usuario a la API para iniciar sesión.
 * @async
 * @param {any} credentials - Objeto con el email y la contraseña del usuario.
 * @returns {Promise<any>} Una promesa que resuelve con los datos del usuario y los tokens.
 * @throws {Error} Si la petición a la API falla.
 */
const login = async (credentials: any) => {
  try {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  } catch (error) {
    console.error("Error en el servicio de login:", error);
    throw error;
  }
};

/**
 * @function forgotPassword
 * @description Envía una solicitud para restablecer la contraseña de un usuario.
 * @async
 * @param {string} email - El correo electrónico del usuario.
 * @returns {Promise<any>} Una promesa que resuelve con la respuesta de la API.
 */
const forgotPassword = async (email: string) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

/**
 * @function resetPassword
 * @description Envía la nueva contraseña y el token de restablecimiento a la API.
 * @async
 * @param {string} password - La nueva contraseña.
 * @param {string} token - El token de restablecimiento recibido por correo.
 * @returns {Promise<any>} Una promesa que resuelve con la respuesta de la API.
 */
const resetPassword = async (password: string, token: string) => {
  const response = await api.post('/auth/reset-password', { password, token });
  return response.data;
};

/**
 * @description Objeto que agrupa y exporta todos los métodos del servicio de autenticación.
 * @type {{login: (credentials: any) => Promise<any>, forgotPassword: (email: string) => Promise<any>, resetPassword: (password: string, token: string) => Promise<any>}}
 */
export const authService = {
  login,
  forgotPassword,
  resetPassword,
};