import { useState, useEffect } from 'react';
import { User, AuthState } from '../types';

// Mock de autenticación para demostración
const mockUsers: User[] = [
  { 
    id: '1', 
    email: 'admin@sena.edu.co', 
    role: 'admin', 
    name: 'Administrador',
    createdAt: '2024-01-15T10:00:00Z',
    lastLogin: '2024-12-20T14:30:00Z',
    status: 'active'
  },
  { 
    id: '2', 
    email: 'usuario@sena.edu.co', 
    role: 'user', 
    name: 'Usuario',
    createdAt: '2024-02-01T09:15:00Z',
    lastLogin: '2024-12-19T16:45:00Z',
    status: 'active'
  },
];

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay un token guardado al cargar la app
    const savedToken = localStorage.getItem('acuaponia_token');
    const savedUser = localStorage.getItem('acuaponia_user');
    
    if (savedToken && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setAuthState({
          user,
          token: savedToken,
          isAuthenticated: true,
        });
      } catch (error) {
        localStorage.removeItem('acuaponia_token');
        localStorage.removeItem('acuaponia_user');
      }
    }
    
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    // Simulación de llamada a API
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const user = mockUsers.find(u => u.email === email);
    
    if (user && password === '123456') { // Password demo
      const token = `mock-jwt-token-${user.id}-${Date.now()}`;
      
      setAuthState({
        user,
        token,
        isAuthenticated: true,
      });
      
      localStorage.setItem('acuaponia_token', token);
      localStorage.setItem('acuaponia_user', JSON.stringify(user));
      
      setLoading(false);
      return true;
    }
    
    setLoading(false);
    return false;
  };

  const logout = () => {
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
    });
    
    localStorage.removeItem('acuaponia_token');
    localStorage.removeItem('acuaponia_user');
  };

  return {
    ...authState,
    loading,
    login,
    logout,
  };
};