import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LoginCredentials } from '../types';
import * as userService from '../services/userService';
import { 
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
} from '../services/authService';

/**
 * @hook useAuth
 * @description Hook centralizado para gestionar la autenticación y los datos del usuario actual.
 */
export const useAuth = () => {
  const [authState, setAuthState] = useState<{ user: User | null; isAuthenticated: boolean; }>({ user: null, isAuthenticated: false });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = getCurrentUser();
    if (token && user) {
      setAuthState({ user, isAuthenticated: true });
    }
    setLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const user = await apiLogin(credentials);
      setAuthState({ user, isAuthenticated: true });
      sessionStorage.setItem('showWelcomeMessage', 'true');
      navigate('/dashboard');
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    apiLogout();
    setAuthState({ user: null, isAuthenticated: false });
    navigate('/login');
  };

  /**
   * @function updateProfile
   * @description Permite al usuario actual actualizar su propia información (nombre, email, contraseña).
   * Actualiza el estado local y el localStorage para reflejar los cambios inmediatamente.
   * @param {Partial<User>} userData - Los datos del perfil a actualizar.
   * @returns {Promise<User>} El usuario con los datos actualizados.
   */
  const updateProfile = useCallback(async (userData: Partial<User>): Promise<User> => {
    if (!authState.user) throw new Error("Usuario no autenticado");

    try {
      const updatedUser = await userService.updateUser(authState.user.id, userData);
      const finalUser = { ...authState.user, ...updatedUser };
      setAuthState(prev => ({ ...prev, user: finalUser }));
      localStorage.setItem('user', JSON.stringify(finalUser));
      return finalUser;
    } catch (error) {
      console.error('Error actualizando el perfil:', error);
      throw error; 
    }
  }, [authState.user]);

  return {
    ...authState,
    loading,
    login,
    logout,
    updateProfile,
  };
};