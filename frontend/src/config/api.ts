/**
 * @file api.ts
 * @description Configuración centralizada de la instancia de Axios para las llamadas a la API.
 * @author Sistema de Acuaponía SENA
 * @version 1.2.0
 * @since 1.0.0
 */

import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api',
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;