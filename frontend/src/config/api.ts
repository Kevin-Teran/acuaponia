import axios from 'axios';

// Configuración base de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Crear instancia de axios
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('acuaponia_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('acuaponia_token');
      localStorage.removeItem('acuaponia_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Servicios de API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  getMe: () =>
    api.get('/auth/me'),
  
  refreshToken: () =>
    api.post('/auth/refresh'),
};

export const usersAPI = {
  getAll: () =>
    api.get('/users'),
  
  create: (userData: any) =>
    api.post('/users', userData),
  
  update: (id: string, userData: any) =>
    api.put(`/users/${id}`, userData),
  
  toggleStatus: (id: string) =>
    api.patch(`/users/${id}/toggle-status`),
  
  delete: (id: string) =>
    api.delete(`/users/${id}`),
};

export const sensorsAPI = {
  getAll: () =>
    api.get('/sensors'),
  
  create: (sensorData: any) =>
    api.post('/sensors', sensorData),
  
  update: (id: string, sensorData: any) =>
    api.put(`/sensors/${id}`, sensorData),
  
  delete: (id: string) =>
    api.delete(`/sensors/${id}`),
  
  getData: (sensorId: string, params?: any) =>
    api.get(`/sensors/${sensorId}/data`, { params }),
};

export const tanksAPI = {
  getAll: () =>
    api.get('/tanks'),
  
  create: (tankData: any) =>
    api.post('/tanks', tankData),
  
  update: (id: string, tankData: any) =>
    api.put(`/tanks/${id}`, tankData),
  
  delete: (id: string) =>
    api.delete(`/tanks/${id}`),
};

export const dataAPI = {
  getHistorical: (params?: any) =>
    api.get('/data/historical', { params }),
  
  getStatistics: (params?: any) =>
    api.get('/data/statistics', { params }),
  
  getRealtime: () =>
    api.get('/data/realtime'),
};

export const reportsAPI = {
  generate: (type: string, params?: any) =>
    api.post(`/reports/generate/${type}`, params),
  
  download: (reportId: string) =>
    api.get(`/reports/download/${reportId}`, { responseType: 'blob' }),
};

export default api;