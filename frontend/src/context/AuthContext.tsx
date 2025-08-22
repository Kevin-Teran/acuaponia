/**
 * @file AuthContext.tsx
 * @description Proveedor de contexto para la gestión de la autenticación.
 * Versión final con manejo de estado robusto y depuración.
 * @author Kevin Mariano
 * @version 6.0.0 (Final)
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
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkUserSession = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const userData = await authService.getMe();
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('accessToken');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkUserSession();
  }, [checkUserSession]);

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authService.login(credentials);
      
      console.log('Respuesta RECIBIDA del backend en AuthContext:', response);

      if (response && response.accessToken && response.user) {
        localStorage.setItem('accessToken', response.accessToken);
        setUser(response.user);
        router.push('/dashboard');
      } else {
        throw new Error('Respuesta de login inválida desde el servidor.');
      }
    } catch (error: any) {
        console.error('AuthContext: Falló el proceso de login:', error.message);
        throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('accessToken');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoadingSpinner message="Inicializando sesión..." />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
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