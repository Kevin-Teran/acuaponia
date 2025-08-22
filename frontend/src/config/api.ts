/**
 * @file api.ts
 * @description Configuración centralizada y a prueba de fallos del cliente Axios.
 * Esta es la configuración definitiva que intercepta cada petición para inyectar
 * el token de autenticación, con logging detallado para depuración.
 * @author Kevin Mariano
 * @version 4.0.0 
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
    console.log(`[API Interceptor Request] -> Petición saliente a: ${config.url}`);

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      
      if (token) {
        console.log('[API Interceptor Request] -> Token encontrado. Adjuntando a cabecera...');
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn(`[API Interceptor Request] -> No se encontró 'accessToken' en localStorage. La petición irá sin autenticación.`);
      }
    }
    
    return config;
  },
  (error) => {
    console.error('[API Interceptor Request] -> Error al configurar la petición:', error);
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
    return response;
  },
  (error) => {
    console.error(`[API Interceptor Response] -> Error en la respuesta de: ${error.config.url}`, error.response);

    if (error.response && error.response.status === 401) {
      console.error('[API Interceptor Response] -> ¡ERROR 401 DETECTADO! Token inválido o expirado. Redirigiendo al login.');
      
      localStorage.removeItem('accessToken');
      
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
    }

    return Promise.reject(error);
  }
);


export default api;