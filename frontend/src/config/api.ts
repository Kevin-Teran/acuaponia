import axios from 'axios';

/**
 * @description Instancia de Axios pre-configurada para la API.
 */
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
  /**
   * @property {boolean} withCredentials - ¡CRÍTICO!
   * Esto permite a Axios enviar y recibir automáticamente las cookies
   * seguras (httpOnly) en cada petición al backend.
   */
  withCredentials: true,
});

/**
 * @description Interceptor de respuestas para manejar errores de forma centralizada.
 * Particularmente útil para el error 401 (No Autorizado), que indica una sesión expirada.
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.error('Sesión expirada o inválida. Se requiere re-autenticación.');
    }
    return Promise.reject(error);
  },
);

export default api;