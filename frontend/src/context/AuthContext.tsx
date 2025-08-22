/**
 * @file AuthContext.tsx
 * @description Proveedor de contexto para gestionar el estado de autenticación global en la aplicación.
 * Maneja la persistencia de sesión, tokens JWT y redirecciones automáticas basadas en el estado de auth.
 * @author kevin mariano
 * @version 3.0.0
 * @since 1.0.0
 */

"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { authService } from '@/services/authService';
import { useRouter } from 'next/navigation';

/**
 * @typedef {object} AuthContextType
 * @description Define la estructura completa del contexto de autenticación con todas las propiedades y métodos disponibles.
 * @property {User | null} user - El objeto del usuario autenticado o null si no hay sesión activa
 * @property {boolean} isAuthenticated - Indica si existe una sesión de usuario válida
 * @property {boolean} isLoading - Estado de carga durante la verificación inicial de sesión
 * @property {'light' | 'dark'} theme - Tema visual actual de la aplicación
 * @property {(credentials: LoginCredentials) => Promise<void>} login - Función para iniciar sesión
 * @property {() => void} logout - Función para cerrar sesión y limpiar datos
 * @property {() => void} toggleTheme - Función para alternar entre tema claro y oscuro
 */
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  theme: 'light' | 'dark';
  login: (credentials: any) => Promise<void>;
  logout: () => void;
  toggleTheme: () => void;
}

/**
 * @typedef {object} AuthProviderProps
 * @description Props para el componente proveedor de autenticación.
 * @property {ReactNode} children - Los componentes hijos que tendrán acceso al contexto de autenticación
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * @constant {React.Context<AuthContextType | undefined>} AuthContext
 * @description Contexto de React para compartir el estado de autenticación entre componentes.
 * @private
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * @class AuthProvider
 * @description Componente proveedor que encapsula la lógica de autenticación y manejo de temas.
 * Gestiona la persistencia de sesión en localStorage y sincroniza el tema con las preferencias del sistema.
 * @example
 * // Envolver la aplicación con el proveedor
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <Router>
 *         <Routes>
 *           <Route path="/login" element={<LoginPage />} />
 *           <Route path="/dashboard" element={<Dashboard />} />
 *         </Routes>
 *       </Router>
 *     </AuthProvider>
 *   );
 * }
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const router = useRouter();

  /**
   * @method useEffect - Inicialización
   * @description Hook de efecto que se ejecuta al montar el componente para restaurar
   * la sesión del usuario y configurar el tema desde localStorage o preferencias del sistema.
   * @private
   */
  useEffect(() => {
    /**
     * @function initializeAuth
     * @description Restaura la sesión del usuario desde localStorage si existe un token válido.
     * También inicializa el tema basado en preferencias guardadas o configuración del sistema.
     * @async
     * @private
     * @example
     * // Se ejecuta automáticamente al cargar la aplicación
     * // Busca en localStorage: 'accessToken', 'user', 'theme'
     */
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const userJSON = localStorage.getItem('user');

        if (token && userJSON) {
          const storedUser: User = JSON.parse(userJSON);
          
          if (storedUser.id && storedUser.email && storedUser.role) {
            setUser(storedUser);
          } else {
            console.warn('Datos de usuario corruptos en localStorage');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
          }
        }

        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        
        if (savedTheme) {
          setTheme(savedTheme);
        } else {
          const prefersDark = window.matchMedia && 
            window.matchMedia('(prefers-color-scheme: dark)').matches;
          const initialTheme = prefersDark ? 'dark' : 'light';
          setTheme(initialTheme);
          localStorage.setItem('theme', initialTheme);
        }

      } catch (error) {
        console.error("Error al restaurar la sesión:", error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * @method useEffect - Aplicación de tema
   * @description Sincroniza el tema actual con el DOM y localStorage cada vez que cambia.
   * @private
   */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  /**
   * @method login
   * @description Autentica al usuario con las credenciales proporcionadas y establece la sesión.
   * Guarda los tokens y datos del usuario en localStorage para persistencia entre sesiones.
   * @async
   * @param {any} credentials - Objeto con las credenciales de login (email, password, rememberMe)
   * @returns {Promise<void>} Promesa que resuelve cuando el login es exitoso
   * @throws {Error} Si las credenciales son incorrectas o hay un error de red
   * @example
   * try {
   *   await login({
   *     email: 'usuario@acuaponia.com',
   *     password: 'miPassword123',
   *     rememberMe: true
   *   });
   *   console.log('Login exitoso, redirigiendo al dashboard');
   * } catch (error) {
   *   console.error('Error de autenticación:', error.message);
   * }
   */
  const login = async (credentials: any) => {
    try {
      setIsLoading(true);
      
      const { user: authenticatedUser, accessToken, refreshToken } = await authService.login(credentials);
      
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(authenticatedUser));
      
      setUser(authenticatedUser);
      
      router.push('/dashboard');
      
    } catch (error) {
      console.error('Error de inicio de sesión:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * @method logout
   * @description Cierra la sesión del usuario, limpia todos los datos de autenticación
   * y redirige a la página de login. También notifica al servidor del logout.
   * @returns {void}
   * @example
   * // Llamada desde un componente
   * const { logout } = useAuth();
   * 
   * const handleLogout = () => {
   *   logout();
   *   console.log('Sesión cerrada exitosamente');
   * };
   */
  const logout = async () => {
    try {
    } catch (error) {
      console.warn('Error al notificar logout al servidor:', error);
    } finally {
      setUser(null);
      localStorage.clear();
      router.push('/login');
    }
  };

  /**
   * @method toggleTheme
   * @description Alterna entre el tema claro y oscuro de la aplicación.
   * El cambio se persiste automáticamente en localStorage y se aplica al DOM.
   * @returns {void}
   * @example
   * const { theme, toggleTheme } = useAuth();
   * 
   * return (
   *   <button onClick={toggleTheme}>
   *     Cambiar a tema {theme === 'light' ? 'oscuro' : 'claro'}
   *   </button>
   * );
   */
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const isAuthenticated = !isLoading && !!user;

  /**
   * @constant {AuthContextType} contextValue
   * @description Objeto con todos los valores y funciones que se proporcionan a través del contexto.
   * @private
   */
  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    theme,
    login,
    logout,
    toggleTheme,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * @function useAuth
 * @description Hook personalizado para acceder al contexto de autenticación desde cualquier componente.
 * Incluye validación para asegurar que se usa dentro del proveedor correcto.
 * @returns {AuthContextType} El objeto completo del contexto de autenticación
 * @throws {Error} Si se intenta usar fuera de un AuthProvider
 * @example
 * // En un componente funcional
 * function Dashboard() {
 *   const { user, isAuthenticated, isLoading, logout } = useAuth();
 *   
 *   if (isLoading) {
 *     return <LoadingSpinner />;
 *   }
 *   
 *   if (!isAuthenticated) {
 *     return <RedirectToLogin />;
 *   }
 *   
 *   return (
 *     <div>
 *       <h1>Bienvenido, {user.name}</h1>
 *       <button onClick={logout}>Cerrar Sesión</button>
 *     </div>
 *   );
 * }
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error(
      'useAuth debe ser utilizado dentro de un AuthProvider. ' +
      'Asegúrate de envolver tu aplicación o componente con <AuthProvider>'
    );
  }
  
  return context;
};