/**
 * @file AuthContext.tsx
 * @description Proveedor de contexto para gestionar el estado de autenticación global.
 * @author kevin mariano
 * @version 2.0.0
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
 * @property {User | null} user - El objeto del usuario autenticado o null.
 * @property {boolean} isAuthenticated - Indica si el usuario está autenticado.
 * @property {boolean} isLoading - Indica si se está cargando el estado de autenticación inicial.
 * @property {(credentials: any) => Promise<void>} login - Función para iniciar sesión.
 * @property {() => void} logout - Función para cerrar sesión.
 */
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
}

/**
 * @type {React.Context<AuthContextType | undefined>}
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * @typedef {object} AuthProviderProps
 * @property {ReactNode} children - Componentes hijos que tendrán acceso al contexto.
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * @function AuthProvider
 * @description Componente proveedor que envuelve la aplicación y gestiona el estado de autenticación.
 * @param {AuthProviderProps} props - Propiedades del componente.
 * @returns {JSX.Element}
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    /**
     * @function initializeAuth
     * @description Comprueba si existe un token en localStorage para restaurar la sesión.
     * @async
     */
    const initializeAuth = async () => {
      const token = localStorage.getItem('accessToken');
      const userJSON = localStorage.getItem('user');

      if (token && userJSON) {
        try {
          const storedUser: User = JSON.parse(userJSON);
          setUser(storedUser);
        } catch (error) {
          console.error("Error al restaurar la sesión:", error);
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  /**
   * @function login
   * @description Maneja el inicio de sesión del usuario.
   * @async
   * @param {any} credentials - Credenciales de inicio de sesión (email y password).
   * @throws {Error} Si el inicio de sesión falla.
   */
  const login = async (credentials: any) => {
    try {
      const { user, accessToken, refreshToken } = await authService.login(credentials);
      setUser(user);
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      router.push('/dashboard');
    } catch (error) {
      console.error('Error de inicio de sesión:', error);
      throw error;
    }
  };

  /**
   * @function logout
   * @description Cierra la sesión del usuario y limpia los datos de autenticación.
   */
  const logout = () => {
    setUser(null);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * @function useAuth
 * @description Hook personalizado para acceder al contexto de autenticación.
 * @returns {AuthContextType} El estado y las funciones del contexto.
 * @throws {Error} Si se usa fuera de un AuthProvider.
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};