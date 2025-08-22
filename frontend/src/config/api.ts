/**
 * @file api.ts
 * @description Configuración centralizada de la instancia de Axios.
 * Intercepta las peticiones para adjuntar el token de autenticación.
 * @author kevin mariano
 * @version 1.1.0
 * @since 1.0.0
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * @description Interceptor de peticiones de Axios.
 * Este es el código clave que soluciona el error 401 Unauthorized.
 */
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;