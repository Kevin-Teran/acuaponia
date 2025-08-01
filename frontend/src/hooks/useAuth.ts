import { useState, useEffect } from 'react';
import { User, LoginCredentials } from '../types';
import { 
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
  refreshToken 
} from '../services/authService';
import * as userService from '../services/userService';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

/**
 * Hook personalizado para manejar la autenticación
 * @returns {Object} Objeto con estado de autenticación y métodos relacionados
 */
export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSession = () => {
      try {
        const token = localStorage.getItem('token');
        const user = getCurrentUser();
        
        if (token && user) {
          setAuthState({ user, token, isAuthenticated: true });
        }
      } catch (err) {
        console.error('Error cargando sesión:', err);
        setError('Error al cargar la sesión');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const user = await apiLogin(credentials);
      const token = localStorage.getItem('token');
      
      if (user && token) {
        setAuthState({
          user,
          token,
          isAuthenticated: true,
        });
        return true;
      } else {
        setError('Error: datos de usuario o token faltantes');
        return false;
      }
    } catch (err: any) {
      console.error('Error en useAuth.login:', err);
      setError(err.message || 'Error desconocido en login');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    apiLogout();
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  };

  /**
   * Refresca el token de autenticación manualmente si es necesario.
   * Nota: El interceptor de API ya lo hace automáticamente.
   * @returns {Promise<boolean>} Indica si el refresh fue exitoso
   */
  const refreshAuth = async (): Promise<boolean> => {
    try {
      const newToken = await refreshToken();
      const user = getCurrentUser();
      
      if (newToken && user) {
        setAuthState({
          user,
          token: newToken,
          isAuthenticated: true,
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error en refreshAuth manual:', err);
      logout(); 
      return false;
    }
  };

  const updateProfile = async (userData: Partial<User>): Promise<User> => {
    if (!authState.user) throw new Error("Usuario no autenticado");

    try {
      const updatedUser = await userService.updateUser(authState.user.id, userData);
      const finalUser = { ...authState.user, ...updatedUser };
      setAuthState(prev => ({ ...prev, user: finalUser }));
      localStorage.setItem('user', JSON.stringify(finalUser));
      return finalUser;
    } catch (error) {
      console.error('Error actualizando el perfil:', error);
      throw error; 
    }
  };

  return {
    ...authState,
    loading,
    error,
    login,
    logout,
    refreshAuth, 
    updateProfile,
  };
};
