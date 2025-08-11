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
 * Proporciona una interfaz limpia para el login, logout y la actualización del perfil.
 */
export const useAuth = () => {
  const [authState, setAuthState] = useState<{ user: User | null; isAuthenticated: boolean; }>({ user: null, isAuthenticated: false });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Efecto para verificar la sesión al cargar la aplicación por primera vez.
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = getCurrentUser();
    if (token && user) {
      setAuthState({ user, isAuthenticated: true });
    }
    setLoading(false);
  }, []);

  /**
   * @function login
   * @description Realiza el proceso de login llamando al servicio de autenticación.
   * Maneja el estado de carga y la navegación en caso de éxito.
   * @param {LoginCredentials} credentials - Las credenciales del usuario.
   * @throws {Error} Propaga el error del servicio para que el componente de UI lo maneje.
   */
  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      const user = await apiLogin(credentials);
      setAuthState({ user, isAuthenticated: true });
      // Mensaje de bienvenida para la primera vez que inicia sesión en esta sesión del navegador.
      sessionStorage.setItem('showWelcomeMessage', 'true');
      navigate('/dashboard');
    } catch (err) {
      // Propaga el error para que LoginForm.tsx pueda mostrarlo con SweetAlert2.
      throw err;
    }
  };

  /**
   * @function logout
   * @description Cierra la sesión del usuario y lo redirige a la página de login.
   */
  const logout = () => {
    apiLogout();
    setAuthState({ user: null, isAuthenticated: false });
    navigate('/login');
  };

  /**
   * @function updateProfile
   * @description Permite al usuario actual actualizar su propia información.
   * @param {Partial<User>} userData - Los datos del perfil a actualizar.
   * @returns {Promise<User>} El usuario con los datos actualizados.
   */
  const updateProfile = useCallback(async (userData: Partial<User>): Promise<User> => {
    if (!authState.user) throw new Error("Usuario no autenticado");

    try {
      const updatedUser = await userService.updateUser(authState.user.id, userData);
      const finalUser = { ...authState.user, ...updatedUser };
      setAuthState(prev => ({ ...prev, user: finalUser }));
      localStorage.setItem('user', JSON.stringify(finalUser)); // Actualiza también el localStorage
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