import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('acuaponia_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Error en request interceptor:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    // Log de respuestas exitosas en desarrollo
    if (import.meta.env.DEV) {
      console.log('API Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  (error) => {
    // Log de errores
    console.error('API Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    });

    // Manejar errores específicos
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('acuaponia_token');
      localStorage.removeItem('acuaponia_refresh_token');
      localStorage.removeItem('acuaponia_user');
      
      // Solo redirigir si no estamos ya en login
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 403) {
      // Acceso prohibido
      console.warn('Acceso prohibido:', error.response.data);
    } else if (error.response?.status >= 500) {
      // Error del servidor
      console.error('Error del servidor:', error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      console.error('Timeout de la petición');
    } else if (!error.response) {
      // Error de red
      console.error('Error de conexión de red');
    }

    return Promise.reject(error);
  }
);

export default api;