/**
 * @file authService.ts
 * @description Servicio para gestionar operaciones de autenticación, incluyendo el manejo
 * de tokens (acceso y refresco) y la gestión de la sesión del usuario en localStorage.
 */
 import api from '@/config/api';
 import { LoginCredentials, User } from '@/types';
 
 /**
  * @interface LoginResponse
  * @description Define la estructura de la respuesta esperada del endpoint de login.
  */
 interface LoginResponse {
   user: User;
   tokens: {
     accessToken: string;
     refreshToken: string;
   };
 }
 
 /**
  * @function setSession
  * @description Almacena los tokens y los datos del usuario en localStorage.
  * @param {string | null} accessToken - El token de acceso.
  * @param {string | null} refreshToken - El token de refresco.
  * @param {User | null} user - Los datos del usuario.
  */
 const setSession = (accessToken: string | null, refreshToken: string | null, user: User | null) => {
   if (accessToken && refreshToken && user) {
     localStorage.setItem('accessToken', accessToken);
     localStorage.setItem('refreshToken', refreshToken);
     localStorage.setItem('user', JSON.stringify(user));
   } else {
     localStorage.removeItem('accessToken');
     localStorage.removeItem('refreshToken');
     localStorage.removeItem('user');
   }
 };
 
 /**
  * @function login
  * @description Envía las credenciales al backend para autenticar al usuario y guarda la sesión.
  * @param {LoginCredentials} credentials - Credenciales de email, password y rememberMe.
  * @returns {Promise<User>} Una promesa que resuelve con el objeto del usuario autenticado.
  * @throws {Error} Si la respuesta del servidor es inválida o si ocurre un error de red/servidor.
  */
 export const login = async (credentials: LoginCredentials): Promise<User> => {
   try {
     const response = await api.post<LoginResponse>('/auth/login', credentials);
     const { user, tokens } = response.data;
 
     if (user && tokens) {
       setSession(tokens.accessToken, tokens.refreshToken, user);
       return user;
     } else {
       throw new Error('La respuesta del servidor no es válida.');
     }
   } catch (error: any) {
     const errorMessage = error.response?.data?.message || 'Error de autenticación. Inténtelo de nuevo.';
     throw new Error(errorMessage);
   }
 };
 
 /**
  * @function logout
  * @description Cierra la sesión del usuario eliminando los datos de localStorage.
  */
 export const logout = (): void => {
   setSession(null, null, null);
 };
 
 /**
  * @function getCurrentUser
  * @description Obtiene los datos del usuario actual desde localStorage.
  * @returns {User | null} El objeto del usuario o null si no hay sesión activa.
  */
 export const getCurrentUser = (): User | null => {
   try {
     const userStr = localStorage.getItem('user');
     return userStr ? JSON.parse(userStr) : null;
   } catch (error) {
     console.error('Error al parsear datos de usuario desde localStorage:', error);
     logout();
     return null;
   }
 };
 
 /**
  * @function refreshToken
  * @description Refresca el token de acceso usando el refreshToken. Es llamado automáticamente
  * por el interceptor de Axios cuando un token de acceso expira.
  * @returns {Promise<string>} El nuevo token de acceso.
  * @throws {Error} Si no hay refreshToken o si el refresco falla.
  */
 export const refreshToken = async (): Promise<string> => {
   const storedRefreshToken = localStorage.getItem('refreshToken');
   if (!storedRefreshToken) {
     throw new Error('No hay token de refresco disponible.');
   }
 
   try {
     const response = await api.post<{ accessToken: string }>('/auth/refresh', {
       refreshToken: storedRefreshToken,
     });
     const { accessToken } = response.data;
     localStorage.setItem('accessToken', accessToken);
     return accessToken;
   } catch (error) {
     console.error('La sesión ha expirado. Por favor, inicie sesión de nuevo.', error);
     logout(); 
     throw new Error('Tu sesión ha expirado.');
   }
 };