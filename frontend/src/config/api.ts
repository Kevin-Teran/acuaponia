/**
 * @file api.ts
 * @description Configuración centralizada y a prueba de fallos del cliente Axios.
 * Esta es la configuración definitiva que intercepta cada petición para inyectar
 * el token de autenticación, con logging detallado para depuración.
 * @author Kevin Mariano
 * @version 5.0.0 - Depuración mejorada
 * @since 1.0.0
 */

import axios from 'axios';
import Swal from 'sweetalert2';

/**
 * @constant api
 * @description Instancia de Axios preconfigurada con la URL base de la API.
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
});

/**
 * @interceptor request
 * @description Interceptor que se ejecuta ANTES de cada petición.
 * 1. Busca el token en localStorage.
 * 2. Si lo encuentra, lo inyecta en la cabecera 'Authorization'.
 * 3. Si no lo encuentra, envía la petición sin el token (para rutas públicas como /login).
 * 4. Loggea cada paso en la consola para máxima claridad.
 */
api.interceptors.request.use(
  (config) => {
    console.log(`🌐 [API Request] -> Petición ${config.method?.toUpperCase()} a: ${config.url}`);

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      
      if (token) {
        console.log('🔑 [API Request] -> Token encontrado. Longitud:', token.length);
        console.log('🔑 [API Request] -> Primeros 20 caracteres:', token.substring(0, 20) + '...');
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✅ [API Request] -> Token adjuntado a cabecera Authorization');
      } else {
        console.warn(`⚠️ [API Request] -> No se encontró 'accessToken' en localStorage.`);
        console.log('📝 [API Request] -> Contenido actual de localStorage:', 
          Object.keys(localStorage).map(key => `${key}: ${localStorage.getItem(key)?.substring(0, 20)}...`)
        );
      }
    } else {
      console.log('🪟 [API Request] -> Ejecutándose en servidor (window undefined)');
    }
    
    return config;
  },
  (error) => {
    console.error('❌ [API Request] -> Error al configurar la petición:', error);
    return Promise.reject(error);
  }
);

/**
 * @interceptor response
 * @description Interceptor que se ejecuta DESPUÉS de recibir cada respuesta.
 * Principalmente, maneja errores globales como el 401.
 */
api.interceptors.response.use(
  (response) => {
    console.log(`✅ [API Response] -> ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    
    console.error(`💥 [API Response] -> ${method} ${url} - Error ${status}:`, error.response?.data);

    if (status === 401) {
      console.error('🚨 [API Response] -> ERROR 401 DETECTADO! Token inválido o expirado.');
      
      // Mostrar contenido de localStorage antes de limpiar
      console.log('🔍 [API Response] -> localStorage antes de limpiar:', {
        accessToken: localStorage.getItem('accessToken')?.substring(0, 20) + '...',
        refreshToken: localStorage.getItem('refreshToken')?.substring(0, 20) + '...'
      });
      
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      Swal.fire({
          title: 'Sesión Expirada',
          text: 'Tu sesión ha expirado. Por favor, inicia sesión de nuevo.',
          icon: 'warning',
          confirmButtonText: 'Aceptar'
      }).then(() => {
           if (typeof window !== 'undefined') {
              window.location.href = '/login';
           }
      });
    } else if (status === 403) {
      console.error('🔒 [API Response] -> ERROR 403: Sin permisos suficientes');
    } else if (status >= 500) {
      console.error('🔥 [API Response] -> ERROR del servidor:', status);
    }

    return Promise.reject(error);
  }
);

export default api;