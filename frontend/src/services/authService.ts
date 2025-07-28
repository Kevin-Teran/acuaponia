import { api } from '../config/api';
import { LoginCredentials, User } from '../types';

// --- Interfaz para la respuesta de la API de login ---
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
 * Servicio de Autenticación
 * Contiene toda la lógica para el inicio de sesión, cierre de sesión
 * y gestión de la información del usuario.
 */

/**
 * Inicia sesión en la aplicación.
 * @param credentials - Un objeto con el email y la contraseña del usuario.
 * @returns Los datos del usuario si el inicio de sesión es exitoso.
 */
export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    
    if (response.data.success && response.data.data) {
      const { user, tokens } = response.data.data;

      // Guardar el token y los datos del usuario en el almacenamiento local del navegador.
      localStorage.setItem('acuaponia_token', tokens.accessToken);
      localStorage.setItem('acuaponia_user', JSON.stringify(user));

      return user;
    } else {
      // Si la API responde con éxito pero sin datos, lanzar un error.
      throw new Error('La respuesta de la API no contiene los datos esperados.');
    }
  } catch (error: any) {
    // Si hay un error, lo registramos y lo lanzamos de nuevo para que el componente que lo llamó lo maneje.
    console.error('Error en el servicio de login:', error.response?.data?.message || error.message);
    throw new Error(error.response?.data?.message || 'Error al iniciar sesión. Por favor, inténtelo de nuevo.');
  }
};

/**
 * Cierra la sesión del usuario.
 * Elimina el token y los datos del usuario del almacenamiento local.
 */
export const logout = (): void => {
  localStorage.removeItem('acuaponia_token');
  localStorage.removeItem('acuaponia_user');
  // Redirigir al usuario a la página de login.
  window.location.href = '/login';
};

/**
 * Obtiene los datos del usuario actualmente autenticado desde el almacenamiento local.
 * @returns El objeto del usuario o null si no hay nadie autenticado.
 */
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('acuaponia_user');
  if (userStr) {
    try {
      return JSON.parse(userStr) as User;
    } catch (error) {
      console.error('Error al parsear los datos del usuario:', error);
      return null;
    }
  }
  return null;
};

/**
 * Obtiene el token de autenticación del almacenamiento local.
 * @returns El token como string o null si no existe.
 */
export const getToken = (): string | null => {
  return localStorage.getItem('acuaponia_token');
};
