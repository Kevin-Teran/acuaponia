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
    const loadSession = async () => {
      try {
        const token = localStorage.getItem('acuaponia_token');
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

  /**
   * Inicia sesión con las credenciales proporcionadas
   * @param {Object} credentials - Credenciales de acceso
   * @param {string} credentials.email - Email del usuario
   * @param {string} credentials.password - Contraseña del usuario
   * @returns {Promise<boolean>} Indica si el login fue exitoso
   */
  // CORRECCIÓN 2: Usar LoginCredentials como el tipo del parámetro
  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const user = await apiLogin(credentials);
      const token = localStorage.getItem('acuaponia_token');
      
      if (user && token) {
        setAuthState({
          user,
          token,
          isAuthenticated: true,
        });
        return true;
      } else {
        console.error('User o token faltante después del login');
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

  /**
   * Cierra la sesión actual
   */
  const logout = () => {
    apiLogout();
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  };

  /**
   * Refresca el token de autenticación
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
      console.error('Error en refresh:', err);
      logout();
      return false;
    }
  };

  const updateProfile = async (userData: Partial<User>): Promise<User> => {
    if (!authState.user) throw new Error("Usuario no autenticado");

    try {
      const updatedUser = await userService.updateUser(authState.user.id, userData);
      setAuthState(prev => ({ ...prev, user: updatedUser }));
      localStorage.setItem('acuaponia_user', JSON.stringify(updatedUser));
      return updatedUser;
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