/**
 * @file AuthContext.tsx
 * @route frontend/src/context
 * @description Proveedor de contexto para la gestión de la autenticación.
 * Versión final con manejo de estado robusto y la función para actualizar perfil.
 * @author Kevin Mariano 
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
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
import { updateUser as updateUserService } from '../services/userService'; 
import { User, LoginCredentials } from '../types';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  updateProfile: (dataToUpdate: Partial<Pick<User, 'name' | 'email'> & { password?: string }>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isAuthenticated = !!user;

  const checkUserSession = useCallback(async () => {
    //console.log('🔍 [AuthContext] Verificando sesión existente...');
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        //console.log('📡 [AuthContext] Obteniendo datos del usuario...');
        const userData = await authService.getMe();
        //console.log('✅ [AuthContext] Usuario obtenido:', userData.email);
        setUser(userData);
      } catch (error) {
        //console.error('❌ [AuthContext] Error al obtener usuario:', error);
        localStorage.removeItem('accessToken');
        setUser(null);
      }
    } else {
      //console.log('⚠️ [AuthContext] No hay token, usuario no autenticado');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  const login = async (credentials: LoginCredentials) => {
    //console.log('🚀 [AuthContext] Iniciando proceso de login...');
    try {
      const response = await authService.login(credentials);
      if (response && response.accessToken && response.user) {
        localStorage.setItem('accessToken', response.accessToken);
        if (response.refreshToken) {
          localStorage.setItem('refreshToken', response.refreshToken);
        }
        setUser(response.user);
        //console.log('✅ [AuthContext] Usuario establecido y token guardado');
        router.push('/dashboard');
      } else {
        throw new Error('Respuesta de login inválida desde el servidor.');
      }
    } catch (error: any) {
      console.error('💥 [AuthContext] Falló el proceso de login:', error.message);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      throw error;
    }
  };

  const logout = () => {
    //console.log('🚪 [AuthContext] Cerrando sesión...');
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    router.push('/login');
  };

  const updateProfile = async (dataToUpdate: Partial<Pick<User, 'name' | 'email'> & { password?: string }>) => {
    if (!user) {
      throw new Error("No se puede actualizar el perfil: no hay usuario autenticado.");
    }
    //console.log(`🚀 [AuthContext] Iniciando actualización de perfil para ${user.email}...`);
    try {
      const updatedUser = await updateUserService(user.id, dataToUpdate);
      setUser(updatedUser); 
      //console.log('✅ [AuthContext] Perfil actualizado y estado sincronizado.');
    } catch (error) {
      console.error('💥 [AuthContext] Falló la actualización del perfil:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner message="Inicializando sesión..." />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated,
      login,
      logout,
      updateProfile,
    }}>
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