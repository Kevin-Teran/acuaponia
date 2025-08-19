/**
 * @file authService.ts
 * @description Servicio para gestionar todas las operaciones de autenticación,
 * incluyendo el manejo de tokens de acceso y refresco.
 */
 import api from '@/config/api';
 import { LoginCredentials, User } from '@/types';
 
 interface LoginResponse {
   user: User;
   tokens: {
     accessToken: string;
     refreshToken: string;
   };
 }
 
 /**
  * @function login
  * @description Envía las credenciales al backend para autenticar al usuario.
  * @returns {Promise<User>} Una promesa que resuelve con el objeto del usuario.
  */
 export const login = async (credentials: LoginCredentials): Promise<User> => {
   try {
     const response = await api.post<LoginResponse>('/auth/login', credentials);
     if (response.data?.user && response.data?.tokens) {
       const { user, tokens } = response.data;
       localStorage.setItem('token', tokens.accessToken);
       localStorage.setItem('refreshToken', tokens.refreshToken);
       localStorage.setItem('user', JSON.stringify(user));
       return user;
     } else {
       throw new Error('La respuesta del servidor no contiene los datos esperados.');
     }
   } catch (error: any) {
     const errorMessage = error.response?.data?.message || error.message || 'Ocurrió un error inesperado.';
     throw new Error(errorMessage);
   }
 };
 
 /**
  * @function logout
  * @description Cierra la sesión del usuario eliminando los datos del localStorage.
  */
 export const logout = (): void => {
   localStorage.removeItem('token');
   localStorage.removeItem('refreshToken');
   localStorage.removeItem('user');
 };
 
 /**
  * @function getCurrentUser
  * @description Obtiene el usuario actual desde el localStorage.
  * @returns {User | null} El objeto del usuario o nulo si no está autenticado.
  */
 export const getCurrentUser = (): User | null => {
   try {
     const userStr = localStorage.getItem('user');
     return userStr ? JSON.parse(userStr) : null;
   } catch (error) {
     console.error('Error parseando el usuario desde localStorage:', error);
     logout();
     return null;
   }
 };
 
 /**
  * @function refreshToken
  * @description Refresca el token de autenticación usando el refreshToken almacenado.
  * @returns {Promise<string>} El nuevo token de acceso.
  */
 export const refreshToken = async (): Promise<string> => {
   const refreshTokenValue = localStorage.getItem('refreshToken');
   if (!refreshTokenValue) {
     throw new Error('No hay refreshToken disponible para renovar la sesión.');
   }
 
   try {
     const response = await api.post('/auth/refresh', {
       refreshToken: refreshTokenValue,
     });
     const newAccessToken = response.data.accessToken;
     localStorage.setItem('token', newAccessToken);
     return newAccessToken;
   } catch (error) {
     console.error('Error al refrescar el token, la sesión ha expirado:', error);
     logout();
     throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
   }
 };
 