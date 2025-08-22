/**
 * @file AuthContext.tsx
 * @description Proveedor de contexto para gestionar el estado de autenticación global en la aplicación.
 * @author kevin mariano
 * @version 2.1.0
 * @since 1.0.0
 */

"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { authService } from '@/services/authService';
import { useRouter } from 'next/navigation';

/**
 * @typedef {object} AuthContextType
 * @description Define la estructura del contexto de autenticación.
 */
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); 
  const router = useRouter();

  useEffect(() => {
    /**
     * @function initializeAuth
     * @description Comprueba si existe un token en localStorage para restaurar la sesión.
     */
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('accessToken');
        const userJSON = localStorage.getItem('user');

        if (token && userJSON) {
          const storedUser: User = JSON.parse(userJSON);
          setUser(storedUser);
        }
      } catch (error) {
        console.error("Error al restaurar la sesión:", error);
        localStorage.clear();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * @function login
   * @description Maneja el inicio de sesión del usuario.
   */
  const login = async (credentials: any) => {
    try {
      const { user, accessToken, refreshToken } = await authService.login(credentials);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      router.push('/dashboard');
    } catch (error) {
      console.error('Error de inicio de sesión:', error);
      throw error;
    }
  };

  /**
   * @function logout
   * @description Cierra la sesión del usuario.
   */
  const logout = () => {
    setUser(null);
    localStorage.clear();
    router.push('/login');
  };

  const isAuthenticated = !isLoading && !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * @function useAuth
 * @description Hook para acceder al contexto de autenticación.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};