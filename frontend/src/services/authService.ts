/**
 * @file authService.ts
 * @description Servicio para gestionar todas las operaciones de autenticación con la API.
 * @author Sistema de Acuaponía SENA
 * @version 2.0.0
 * @since 1.0.0
 */

import api from '@/config/api'; 
import { LoginCredentials, AuthResponse, User } from '@/types';

export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};
  
export const logout = async (): Promise<{ message: string }> => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const forgotPassword = async (email: string): Promise<{ message: string }> => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token: string, password: string): Promise<{ message: string }> => {
  const response = await api.post('/auth/reset-password', { token, password });
  return response.data;
};