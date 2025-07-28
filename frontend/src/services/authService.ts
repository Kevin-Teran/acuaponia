import { api } from '../config/api';
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

export const login = async (credentials: LoginCredentials): Promise<User> => {
  try {
    const response = await api.post<LoginResponse>('/auth/login', credentials);
    
    if (response.data.success && response.data.data) {
      const { user, tokens } = response.data.data;

      localStorage.setItem('acuaponia_token', tokens.accessToken);
      localStorage.setItem('acuaponia_refresh_token', tokens.refreshToken);
      localStorage.setItem('acuaponia_user', JSON.stringify(user));

      // Configurar el token en axios para peticiones futuras
      api.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;

      return user;
    }
    throw new Error('La respuesta de la API no contiene los datos esperados.');
  } catch (error: any) {
    console.error('Error en el servicio de login:', error);
    throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
  }
};

export const logout = (): void => {
  localStorage.removeItem('acuaponia_token');
  localStorage.removeItem('acuaponia_refresh_token');
  localStorage.removeItem('acuaponia_user');
  delete api.defaults.headers.common['Authorization'];
  window.location.href = '/login';
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('acuaponia_user');
  return userStr ? JSON.parse(userStr) : null;
};

export const refreshToken = async (): Promise<string> => {
  const refreshToken = localStorage.getItem('acuaponia_refresh_token');
  if (!refreshToken) throw new Error('No hay refresh token disponible');

  try {
    const response = await api.post('/auth/refresh', { refreshToken });
    const newAccessToken = response.data.data.accessToken;
    
    localStorage.setItem('acuaponia_token', newAccessToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
    
    return newAccessToken;
  } catch (error) {
    logout();
    throw error;
  }
};

// Interceptor para manejar tokens expirados
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const newToken = await refreshToken();
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        logout();
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);