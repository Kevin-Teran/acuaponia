'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { LoginCredentials, User } from '@/types';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  theme: string;
  toggleTheme: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); 
  const [theme, setTheme] = useState('light');
  const router = useRouter();

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };
  
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const { data: userData } = await axios.get<User>(`${API_URL}/auth/profile`);
          setUser(userData);
        } catch (error) {
          console.error('Sesión inválida, cerrando sesión.');
          logout();
        }
      }
      setLoading(false);
    };
    checkSession();
  }, [logout]);

  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_URL}/auth/login`, credentials);
      const token = data.access_token;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const { data: userData } = await axios.get<User>(`${API_URL}/auth/profile`);
      setUser(userData);

      router.push('/dashboard'); 
    } catch (error) {
      logout(); 
      if (axios.isAxiosError(error) && error.response) {
        throw new Error(error.response.data.message || 'Error al iniciar sesión.');
      }
      throw new Error('Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const value = { isAuthenticated: !!user, user, loading, login, logout, theme, toggleTheme };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};