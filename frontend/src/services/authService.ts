import api from '../config/api';
import { LoginCredentials, User } from '../types';

/**
 * @interface LoginResponse
 * @description Define la estructura de la respuesta exitosa que se espera del endpoint de login del backend de NestJS.
 */
interface LoginResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

/**
 * @function login
 * @description Envía las credenciales de un usuario al backend para autenticarlo.
 * Si la autenticación es exitosa, guarda los tokens y los datos del usuario en el localStorage.
 * @param {LoginCredentials} credentials - Objeto con email, password y la bandera opcional rememberMe.
 * @returns {Promise<User>} Una promesa que resuelve con el objeto del usuario autenticado.
 * @throws {Error} Lanza un error con el mensaje específico proporcionado por la API si la autenticación falla.
 */
export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', credentials);

    if (response.data && response.data.user && response.data.tokens) {
      const { user, tokens } = response.data;

      localStorage.setItem('token', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));

      return user;
    } else {
      throw new Error('La respuesta del servidor no contiene los datos esperados.');
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || 'Ocurrió un error inesperado.';
    
    throw new Error(errorMessage);
  }
};

/**
 * @function logout
 * @description Cierra la sesión del usuario actual eliminando los datos de autenticación del localStorage.
 */
export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

/**
 * @function getCurrentUser
 * @description Obtiene el usuario actualmente autenticado desde el localStorage.
 * @returns {User | null} El objeto del usuario actual o nulo si no está autenticado o si los datos están corruptos.
 */
export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('Error parseando el usuario desde localStorage:', error);
    logout();
    return null;
  }
};

/**
 * @function refreshToken
 * @description Refresca el token de autenticación usando el refreshToken almacenado.
 * Esta función es utilizada por el interceptor de Axios para mantener la sesión activa.
 * @returns {Promise<string>} El nuevo token de acceso.
 * @throws {Error} Lanza un error si la renovación del token falla, lo que usualmente significa que la sesión ha expirado.
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
    
    const newAccessToken = response.data.accessToken;
    localStorage.setItem('token', newAccessToken);
    
    return newAccessToken;
  } catch (error) {
    console.error('Error al refrescar el token, la sesión ha expirado:', error);
    logout();
    throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
  }
};