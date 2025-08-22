import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api'; // <-- Lee desde frontend/.env.local

/**
 * @description Instancia de Axios pre-configurada para la API.
 */
const api = axios.create({
  baseURL,
  /**
   * @property {boolean} withCredentials - ¡CRÍTICO!
   * Permite a Axios enviar y recibir cookies seguras (httpOnly) en cada petición.
   */
  withCredentials: true,
});

/**
 * @description Interceptor para manejar errores 401 (Sesión Expirada) de forma global.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Sesión expirada o inválida. Disparando evento de logout global.');
      window.dispatchEvent(new Event('auth-error'));
    }
    return Promise.reject(error);
  },
);

export { api };