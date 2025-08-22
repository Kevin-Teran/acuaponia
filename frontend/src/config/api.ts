/**
 * @file api.ts
 * @description Configuración centralizada del cliente Axios para las peticiones a la API.
 * @author kevin mariano
 * @version 2.0.0
 * @since 1.0.0
 */

import axios from 'axios';

/**
 * @type {import('axios').AxiosInstance}
 * @description Instancia de Axios configurada con la URL base de la API.
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
});

/**
 * @function
 * @description Interceptor de peticiones de Axios para inyectar el token de autenticación.
 * Obtiene el token del localStorage y lo añade al encabezado 'Authorization' de cada petición.
 *
 * @param {import('axios').InternalAxiosRequestConfig} config - La configuración de la petición saliente.
 * @returns {import('axios').InternalAxiosRequestConfig} La configuración modificada con el token.
 */
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;