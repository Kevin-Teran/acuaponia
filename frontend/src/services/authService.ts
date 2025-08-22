/**
 * @file authService.ts
 * @description Servicio para gestionar operaciones de autenticación y sesión de usuario.
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
  * @function setSession
  * @description Almacena o elimina los datos de la sesión en localStorage.
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
  * @description Autentica al usuario y guarda la sesión.
  */
 export const login = async (credentials: LoginCredentials): Promise<User> => {
   try {
     const response = await api.post<LoginResponse>('/auth/login', credentials);
     const { user, tokens } = response.data;
 
     if (user && tokens) {
       setSession(tokens.accessToken, tokens.refreshToken, user);
       return user;
     } else {
       throw new Error('Respuesta del servidor inválida.');
     }
   } catch (error: any) {
     const errorMessage = error.response?.data?.message || 'Error de autenticación. Inténtelo de nuevo.';
     throw new Error(errorMessage);
   }
 };
 
 /**
  * @function logout
  * @description Cierra la sesión del usuario.
  */
 export const logout = (): void => {
   setSession(null, null, null);
 };
 
 /**
  * @function getCurrentUser
  * @description Obtiene el usuario actual desde localStorage.
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
  * @description Refresca el token de acceso.
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