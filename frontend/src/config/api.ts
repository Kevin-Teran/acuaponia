/**
 * @file api.ts
 * @description Configuración centralizada del cliente Axios para Next.js.
 * Incluye interceptores para inyectar el token JWT y para manejar la
 * actualización automática de tokens expirados (refresh token).
 */
 import axios from 'axios';
 import { refreshToken, logout } from '@/services/authService';
 
 /**
  * @constant API_BASE_URL
  * @description URL base para las peticiones a la API.
  */
 const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api';
 
 const api = axios.create({
   baseURL: API_BASE_URL,
   timeout: 30000,
   headers: {
     'Content-Type': 'application/json',
   },
 });
 
 /**
  * @interceptor request
  * @description Añade el token de acceso a cada petición saliente.
  */
 api.interceptors.request.use(
   (config) => {
     const token = localStorage.getItem('token');
     if (token) {
       config.headers.Authorization = `Bearer ${token}`;
     }
     return config;
   },
   (error) => Promise.reject(error)
 );
 
 /**
  * @interceptor response
  * @description Maneja los errores de respuesta. Si es un 401, intenta refrescar el token.
  */
 api.interceptors.response.use(
   (response) => response,
   async (error) => {
     const originalRequest = error.config;
 
     if (error.response?.status === 401 && !originalRequest._retry) {
       originalRequest._retry = true;
       try {
         console.log('Token expirado. Intentando refrescar...');
         const newAccessToken = await refreshToken();
         originalRequest.headers['Authorization'] = 'Bearer ' + newAccessToken;
         return api(originalRequest);
       } catch (refreshError) {
         logout();
         window.location.href = '/login';
         return Promise.reject(refreshError);
       }
     }
     return Promise.reject(error);
   }
 );
 
 export default api;
 