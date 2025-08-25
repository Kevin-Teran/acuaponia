/**
 * @file AuthContext.tsx
 * @description Proveedor de contexto para la gestión de la autenticación.
 * Versión final con manejo de estado robusto y depuración.
 * @author Kevin Mariano
 * @version 7.0.0 (Corregido)
 * @since 1.0.0
 */
'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../services/authService';
import { User, LoginCredentials } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Computed property para isAuthenticated
  const isAuthenticated = !!user;

  const checkUserSession = useCallback(async () => {
    console.log('🔍 [AuthContext] Verificando sesión existente...');
    
    const token = localStorage.getItem('accessToken');
    console.log('🔑 [AuthContext] Token en localStorage:', token ? 'ENCONTRADO' : 'NO ENCONTRADO');
    
    if (token) {
      try {
        console.log('📡 [AuthContext] Obteniendo datos del usuario...');
        const userData = await authService.getMe();
        console.log('✅ [AuthContext] Usuario obtenido:', userData.email);
        setUser(userData);
      } catch (error) {
        console.error('❌ [AuthContext] Error al obtener usuario:', error);
        // Token inválido o expirado, limpiar
        localStorage.removeItem('accessToken');
        setUser(null);
      }
    } else {
      console.log('⚠️ [AuthContext] No hay token, usuario no autenticado');
      setUser(null);
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  const login = async (credentials: LoginCredentials) => {
    console.log('🚀 [AuthContext] Iniciando proceso de login...');
    
    try {
      const response = await authService.login(credentials);
      
      console.log('📥 [AuthContext] Respuesta RECIBIDA del backend:', {
        hasUser: !!response?.user,
        hasAccessToken: !!response?.accessToken,
        hasRefreshToken: !!response?.refreshToken,
        userEmail: response?.user?.email
      });

      if (response && response.accessToken && response.user) {
        // Guardar el token en localStorage
        localStorage.setItem('accessToken', response.accessToken);
        console.log('💾 [AuthContext] Token guardado en localStorage');
        
        // Opcional: También guardar refresh token si lo necesitas
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
          console.log('💾 [AuthContext] Refresh token guardado en localStorage');
        }
        
        // Establecer el usuario en el estado
        setUser(response.user);
        console.log('✅ [AuthContext] Usuario establecido en el estado');
        
        // Redirigir al dashboard
        console.log('🔄 [AuthContext] Redirigiendo a /dashboard...');
        router.push('/dashboard');
      } else {
        console.error('❌ [AuthContext] Respuesta inválida:', {
          response: response,
          hasAccessToken: !!response?.accessToken,
          hasUser: !!response?.user
        });
        throw new Error('Respuesta de login inválida desde el servidor.');
      }
    } catch (error: any) {
      console.error('💥 [AuthContext] Falló el proceso de login:', error.message);
      // Limpiar cualquier token que pueda existir
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    console.log('🚪 [AuthContext] Cerrando sesión...');
    
    // Limpiar el estado
    setUser(null);
    
    // Limpiar localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    console.log('🧹 [AuthContext] Tokens eliminados de localStorage');
    
    // Redirigir al login
    router.push('/login');
    console.log('🔄 [AuthContext] Redirigiendo a /login');
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner message="Inicializando sesión..." />
      </div>
    );
  }

  console.log('🏗️ [AuthContext] Renderizando con estado:', {
    isAuthenticated,
    userEmail: user?.email,
    loading
  });

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};