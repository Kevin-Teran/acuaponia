// frontend/src/hooks/useAuth.ts
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
      console.log('🔄 Cargando sesión existente...');
      
      try {
        const token = localStorage.getItem('acuaponia_token');
        const user = getCurrentUser();
        
        console.log('📋 Datos de sesión encontrados:', { 
          hasToken: !!token, 
          hasUser: !!user,
          userName: user?.name 
        });
        
        if (token && user) {
          setAuthState({
            user,
            token,
            isAuthenticated: true,
          });
          console.log('✅ Sesión restaurada exitosamente');
        } else {
          console.log('❌ No hay sesión previa válida');
        }
      } catch (err) {
        console.error('💥 Error cargando sesión:', err);
        setError('Error al cargar la sesión');
      } finally {
        setLoading(false);
        console.log('🏁 Carga de sesión completada');
      }
    };

    loadSession();
  }, []);

  // Función de login con logs detallados
  const login = async (credentials: { email: string; password: string }): Promise<boolean> => {
    console.log('🚀 useAuth.login iniciado con:', { email: credentials.email });
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('📡 Llamando a apiLogin...');
      
      const user = await apiLogin(credentials);
      
      console.log('✅ apiLogin exitoso, usuario recibido:', {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });
      
      const token = localStorage.getItem('acuaponia_token');
      
      console.log('🔑 Token guardado:', { hasToken: !!token });
      
      if (user && token) {
        console.log('💾 Actualizando estado de autenticación...');
        
        setAuthState({
          user,
          token,
          isAuthenticated: true,
        });
        
        console.log('🎉 Login completado exitosamente');
        return true;
      } else {
        console.error('❌ User o token faltante después del login');
        setError('Error: datos de usuario o token faltantes');
        return false;
      }
    } catch (err: any) {
      console.error('💥 Error en useAuth.login:', err);
      
      const errorMessage = err.message || 'Error desconocido en login';
      console.error('📝 Mensaje de error:', errorMessage);
      
      setError(errorMessage);
      throw err; // Re-lanzamos para que LoginForm pueda manejarlo
    } finally {
      console.log('🏁 useAuth.login finalizando...');
      setLoading(false);
    }
  };

  const logout = () => {
    console.log('👋 Iniciando logout...');
    
    apiLogout();
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    
    console.log('✅ Logout completado');
  };

  const refreshAuth = async (): Promise<boolean> => {
    console.log('🔄 Intentando refresh de autenticación...');
    
    try {
      const newToken = await refreshToken();
      const user = getCurrentUser();
      
      if (newToken && user) {
        setAuthState({
          user,
          token: newToken,
          isAuthenticated: true,
        });
        console.log('✅ Refresh exitoso');
        return true;
      }
      console.log('❌ Refresh falló - datos faltantes');
      return false;
    } catch (err) {
      console.error('💥 Error en refresh:', err);
      logout();
      return false;
    }
  };

  // Log del estado actual en cada cambio
  useEffect(() => {
    console.log('📊 Estado de autenticación actualizado:', {
      isAuthenticated: authState.isAuthenticated,
      hasUser: !!authState.user,
      hasToken: !!authState.token,
      loading,
      error
    });
  }, [authState, loading, error]);

  return {
    ...authState,
    loading,
    error,
    login,
    logout,
    refreshAuth,
  };
};