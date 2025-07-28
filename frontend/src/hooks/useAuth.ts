import { useState, useEffect } from 'react';
import { User } from '../types';
import { 
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
  refreshToken
} from '../services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Efecto para cargar la sesión al iniciar
  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = localStorage.getItem('acuaponia_token');
        const user = getCurrentUser();
        
        if (token && user) {
          setAuthState({
            user,
            token,
            isAuthenticated: true,
          });
        }
      } catch (err) {
        console.error('Error loading session:', err);
        setError('Error al cargar la sesión');
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const user = await apiLogin({ email, password });
      const token = localStorage.getItem('acuaponia_token');
      
      if (user && token) {
        setAuthState({
          user,
          token,
          isAuthenticated: true,
        });
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      return false;
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
      logout();
      return false;
    }
  };

  return {
    ...authState,
    loading,
    error,
    login,
    logout,
    refreshAuth,
  };
};