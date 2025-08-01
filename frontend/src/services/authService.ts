import api from '../config/api';
import { LoginCredentials, User } from '../types';

interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
    };
  };
}

/**
 * Autentica a un usuario con las credenciales proporcionadas.
 * @param {LoginCredentials} credentials - Credenciales de inicio de sesión del usuario.
 * @returns {Promise<User>} Objeto del usuario autenticado.
 * @throws {Error} Cuando la autenticación falla.
 */
export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', credentials);

    if (response.data.success && response.data.data) {
      const { user, tokens } = response.data.data;

      // Estandarizamos las claves en localStorage
      localStorage.setItem('token', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      return user;
    } else {
      throw new Error('La respuesta del servidor no contiene los datos esperados.');
    }
  } catch (error: any) {
    console.error('Error de login:', error);
    const errorMessage = error.response?.data?.error?.message || 
                         error.response?.data?.message || 
                         error.message ||
                         'Error inesperado durante el inicio de sesión';
    throw new Error(errorMessage);
  }
};

/**
 * Cierra la sesión del usuario actual eliminando los datos almacenados.
 */
export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

/**
 * Obtiene el usuario actualmente autenticado desde el localStorage.
 * @returns {User | null} Objeto del usuario actual o nulo si no está autenticado.
 */
export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parseando el usuario desde localStorage:', error);
    return null;
  }
};

/**
 * Refresca el token de autenticación usando el refreshToken.
 * @returns {Promise<string>} El nuevo token de acceso.
 * @throws {Error} Cuando la renovación del token falla.
 */
export const refreshToken = async (): Promise<string> => {
  const refreshTokenValue = localStorage.getItem('refreshToken');
  
  if (!refreshTokenValue) {
    throw new Error('No hay refreshToken disponible para renovar la sesión.');
  }

  try {
    const response = await api.post('/auth/refresh', { 
      refreshToken: refreshTokenValue 
    });
    
    const newAccessToken = response.data.data.accessToken;
    localStorage.setItem('token', newAccessToken);
    
    return newAccessToken;
  } catch (error) {
    console.error('Error al refrescar el token, la sesión ha expirado:', error);
    logout();
    throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
  }
};
