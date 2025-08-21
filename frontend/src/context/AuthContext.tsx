/**
 * @file AuthContext.tsx
 * @description Contexto de React para gestión global del estado de autenticación.
 * Proporciona funcionalidades de login, logout, verificación de tokens y gestión de temas.
 * @author Sistema de Acuaponía SENA
 * @version 3.0.0
 * @since 1.0.0
 */

'use client';

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  ReactNode, 
  useCallback,
  useMemo 
} from 'react';
import axios, { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { LoginCredentials, User, AuthError } from '@/types';

/**
 * @typedef {Object} AuthContextType
 * @property {boolean} isAuthenticated - Estado de autenticación del usuario
 * @property {User | null} user - Información del usuario autenticado
 * @property {boolean} loading - Estado de carga durante operaciones de auth
 * @property {boolean} initializing - Estado inicial de verificación de sesión
 * @property {AuthError | null} error - Último error de autenticación
 * @property {Function} login - Función para autenticar usuario
 * @property {Function} logout - Función para cerrar sesión
 * @property {Function} refreshToken - Función para renovar token
 * @property {Function} clearError - Función para limpiar errores
 * @property {'light' | 'dark'} theme - Tema actual de la aplicación
 * @property {Function} toggleTheme - Función para cambiar tema
 */
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  initializing: boolean;
  error: AuthError | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

/**
 * @typedef {Object} AuthProviderProps
 * @property {ReactNode} children - Componentes hijos que tendrán acceso al contexto
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * @typedef {Object} TokenStorage
 * @property {string | null} accessToken - Token de acceso almacenado
 * @property {string | null} refreshToken - Token de actualización almacenado
 * @property {number | null} expiresAt - Timestamp de expiración del token
 */
interface TokenStorage {
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_access_token',
  REFRESH_TOKEN: 'auth_refresh_token',
  USER_DATA: 'auth_user_data',
  THEME: 'app_theme',
  EXPIRES_AT: 'auth_expires_at'
} as const;

/**
 * @class AuthProvider
 * @description Proveedor del contexto de autenticación que encapsula toda la lógica
 * de gestión de sesiones, tokens y estado global de autenticación.
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const router = useRouter();

  /**
   * @method getStoredTokens
   * @description Obtiene los tokens almacenados en localStorage de forma segura.
   * @returns {TokenStorage} Objeto con tokens y información de expiración
   * @private
   */
  const getStoredTokens = useCallback((): TokenStorage => {
    if (typeof window === 'undefined') {
      return { accessToken: null, refreshToken: null, expiresAt: null };
    }

    try {
      const accessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
      const expiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);

      return {
        accessToken,
        refreshToken,
        expiresAt: expiresAt ? parseInt(expiresAt, 10) : null
      };
    } catch (error) {
      console.warn('Error accediendo a localStorage:', error);
      return { accessToken: null, refreshToken: null, expiresAt: null };
    }
  }, []);

  /**
   * @method storeTokens
   * @description Almacena tokens y datos del usuario en localStorage de forma segura.
   * @param {string} accessToken - Token de acceso JWT
   * @param {string | undefined} refreshToken - Token de actualización (opcional)
   * @param {User} userData - Información del usuario
   * @param {number} expiresIn - Tiempo de expiración en segundos
   * @private
   */
  const storeTokens = useCallback((
    accessToken: string,
    refreshToken: string | undefined,
    userData: User,
    expiresIn: number
  ) => {
    if (typeof window === 'undefined') return;

    try {
      const expiresAt = Date.now() + (expiresIn * 1000);

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());

      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }

      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
    } catch (error) {
      console.error('Error almacenando tokens:', error);
    }
  }, []);

  /**
   * @method clearStoredTokens
   * @description Limpia todos los tokens y datos de usuario almacenados.
   * @private
   */
  const clearStoredTokens = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });

      delete axios.defaults.headers.common['Authorization'];
    } catch (error) {
      console.error('Error limpiando tokens:', error);
    }
  }, []);

  /**
   * @method isTokenExpired
   * @description Verifica si el token de acceso ha expirado.
   * @returns {boolean} true si el token está expirado
   * @private
   */
  const isTokenExpired = useCallback((): boolean => {
    const { expiresAt } = getStoredTokens();
    if (!expiresAt) return true;

    const bufferTime = 5 * 60 * 1000; // 5 minutos en millisegundos
    return Date.now() >= (expiresAt - bufferTime);
  }, [getStoredTokens]);

  /**
   * @method handleAuthError
   * @description Maneja errores de autenticación y los convierte a formato estándar.
   * @param {unknown} error - Error recibido de axios u otra fuente
   * @returns {AuthError} Error formateado para el contexto
   * @private
   */
  const handleAuthError = useCallback((error: unknown): AuthError => {
    console.error('Error de autenticación:', error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{message: string; statusCode: number}>;
      
      if (axiosError.response) {
        return {
          message: axiosError.response.data?.message || 'Error de autenticación',
          code: axiosError.response.status,
          type: axiosError.response.status === 401 ? 'UNAUTHORIZED' : 'VALIDATION_ERROR'
        };
      }
      
      if (axiosError.request) {
        return {
          message: 'No se pudo conectar con el servidor. Verifique su conexión.',
          code: 0,
          type: 'NETWORK_ERROR'
        };
      }
    }

    return {
      message: error instanceof Error ? error.message : 'Error inesperado durante la autenticación',
      code: 500,
      type: 'UNKNOWN_ERROR'
    };
  }, []);

  /**
   * @method login
   * @description Autentica un usuario con credenciales y almacena la sesión.
   * @param {LoginCredentials} credentials - Credenciales del usuario
   * @throws {AuthError} Error de autenticación si las credenciales son incorrectas
   * @example
   * await login({
   * email: 'admin@sena.edu.co',
   * password: 'password123',
   * rememberMe: true
   * });
   */
  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // Corrección para asegurar que el payload se envíe correctamente
      const payload = {
          email: credentials.email,
          password: credentials.password,
          rememberMe: !!credentials.rememberMe // Aseguramos que sea un booleano
      };

      const response = await axios.post(`${API_URL}/auth/login`, payload);
      const { access_token, refresh_token, user: userData, expires_in } = response.data;

      if (!access_token || !userData) {
        throw new Error('Respuesta de autenticación inválida del servidor');
      }

      storeTokens(access_token, refresh_token, userData, expires_in);
      setUser(userData);

      router.push('/dashboard');
      
    } catch (error) {
      const authError = handleAuthError(error);
      setError(authError);
      throw authError;
    } finally {
      setLoading(false);
    }
  }, [router, storeTokens, handleAuthError]);

  /**
   * @method logout
   * @description Cierra la sesión del usuario y limpia todos los datos almacenados.
   * @example
   * await logout();
   */
  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const { accessToken } = getStoredTokens();
      if (accessToken) {
        try {
          await axios.post(`${API_URL}/auth/logout`);
        } catch (error) {
          console.warn('Error notificando logout al servidor:', error);
        }
      }
    } finally {
      clearStoredTokens();
      setUser(null);
      setError(null);
      setLoading(false);
      
      router.push('/login');
    }
  }, [router, getStoredTokens, clearStoredTokens]);

  /**
   * @method refreshToken
   * @description Renueva el token de acceso usando el refresh token.
   * @returns {Promise<boolean>} true si la renovación fue exitosa
   * @example
   * const success = await refreshToken();
   * if (success) {
   * console.log('Token renovado exitosamente');
   * }
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    const { refreshToken: storedRefreshToken } = getStoredTokens();
    
    if (!storedRefreshToken) {
      console.warn('No hay refresh token disponible');
      return false;
    }

    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {
        refresh_token: storedRefreshToken
      });

      const { access_token, expires_in } = response.data;
      
      if (!access_token) {
        throw new Error('Respuesta de renovación inválida');
      }

      const expiresAt = Date.now() + (expires_in * 1000);
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access_token);
      localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      return true;
    } catch (error) {
      console.error('Error renovando token:', error);
      await logout();
      return false;
    }
  }, [getStoredTokens, logout]);

  /**
   * @method validateAndRefreshToken
   * @description Valida el token actual y lo renueva si es necesario.
   * @returns {Promise<boolean>} true si el token es válido o se renovó exitosamente
   * @private
   */
  const validateAndRefreshToken = useCallback(async (): Promise<boolean> => {
    const { accessToken } = getStoredTokens();
    
    if (!accessToken) {
      return false;
    }

    if (!isTokenExpired()) {
      return true;
    }

    return await refreshToken();
  }, [getStoredTokens, isTokenExpired, refreshToken]);

  /**
   * @method checkExistingSession
   * @description Verifica si existe una sesión válida almacenada al cargar la aplicación.
   * @private
   */
  const checkExistingSession = useCallback(async (): Promise<void> => {
    setInitializing(true);

    try {
      const { accessToken } = getStoredTokens();
      
      if (!accessToken) {
        setInitializing(false);
        return;
      }

      const isValid = await validateAndRefreshToken();
      
      if (!isValid) {
        clearStoredTokens();
        setInitializing(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/auth/profile`);
        setUser(response.data.user);
      } catch (error) {
        console.error('Error obteniendo perfil:', error);
        clearStoredTokens();
        setUser(null);
      }
    } catch (error) {
      console.error('Error verificando sesión existente:', error);
      clearStoredTokens();
      setUser(null);
    } finally {
      setInitializing(false);
    }
  }, [getStoredTokens, validateAndRefreshToken, clearStoredTokens]);

  /**
   * @method clearError
   * @description Limpia el error actual de autenticación.
   * @example
   * clearError(); // Limpia cualquier error mostrado en la UI
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  /**
   * @method toggleTheme
   * @description Alterna entre tema claro y oscuro.
   * @example
   * toggleTheme(); // Cambia de light a dark o viceversa
   */
  const toggleTheme = useCallback((): void => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
      document.documentElement.classList.toggle('dark', newTheme === 'dark');
    } catch (error) {
      console.warn('Error guardando preferencia de tema:', error);
    }
  }, [theme]);

  /**
   * @method initializeTheme
   * @description Inicializa el tema desde localStorage o preferencias del sistema.
   * @private
   */
  const initializeTheme = useCallback((): void => {
    if (typeof window === 'undefined') return;

    try {
      const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as 'light' | 'dark';
      
      if (storedTheme && ['light', 'dark'].includes(storedTheme)) {
        setTheme(storedTheme);
        document.documentElement.classList.toggle('dark', storedTheme === 'dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const systemTheme = prefersDark ? 'dark' : 'light';
        setTheme(systemTheme);
        document.documentElement.classList.toggle('dark', systemTheme === 'dark');
      }
    } catch (error) {
      console.warn('Error inicializando tema:', error);
    }
  }, []);

  useEffect(() => {
    checkExistingSession();
    initializeTheme();
  }, [checkExistingSession, initializeTheme]);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;
          
          const renewed = await refreshToken();
          if (renewed && originalRequest.headers) {
            const { accessToken } = getStoredTokens();
            originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
            return axios(originalRequest);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [refreshToken, getStoredTokens]);

  const contextValue = useMemo<AuthContextType>(() => ({
    isAuthenticated: !!user,
    user,
    loading,
    initializing,
    error,
    login,
    logout,
    refreshToken,
    clearError,
    theme,
    toggleTheme
  }), [
    user,
    loading,
    initializing,
    error,
    login,
    logout,
    refreshToken,
    clearError,
    theme,
    toggleTheme
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * @function useAuth
 * @description Hook personalizado para acceder al contexto de autenticación.
 * Debe usarse dentro de un AuthProvider.
 * @returns {AuthContextType} Objeto con estado y métodos de autenticación
 * @throws {Error} Si se usa fuera de un AuthProvider
 * @example
 * const { user, login, logout, loading } = useAuth();
 * * if (loading) return <Spinner />;
 * * return user ? <Dashboard /> : <LoginForm />;
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  
  return context;
};
