/**
 * @file AuthContext.tsx
 * @description Proveedor de contexto para gestionar el estado de autenticación global,
 * la sesión del usuario y el tema de la aplicación (claro/oscuro).
 */
 'use client';

 import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
 import { useRouter } from 'next/navigation';
 import * as authService from '@/services/authService';
 import { User, LoginCredentials } from '@/types';
 import { LoadingSpinner } from '@/components/common/LoadingSpinner';
 
 /**
  * @type Theme
  * @description Define los posibles temas de la aplicación.
  */
 type Theme = 'light' | 'dark';
 
 /**
  * @interface AuthContextType
  * @description Define la forma del contexto de autenticación.
  */
 interface AuthContextType {
   user: User | null;
   isAuthenticated: boolean;
   loading: boolean;
   theme: Theme;
   login: (credentials: LoginCredentials) => Promise<void>;
   logout: () => void;
   updateProfile: (userData: Partial<User>) => Promise<User>;
   toggleTheme: () => void;
 }
 
 const AuthContext = createContext<AuthContextType | undefined>(undefined);
 
 /**
  * @provider AuthProvider
  * @description Componente proveedor que gestiona y expone el estado de autenticación y tema.
  */
 export const AuthProvider = ({ children }: { children: ReactNode }) => {
   const [user, setUser] = useState<User | null>(null);
   const [loading, setLoading] = useState(true);
   const [theme, setTheme] = useState<Theme>('light');
   const router = useRouter();
 
   useEffect(() => {
     const initializeApp = () => {
       try {
         const storedTheme = localStorage.getItem('theme') as Theme;
         if (storedTheme) {
           setTheme(storedTheme);
           document.documentElement.classList.toggle('dark', storedTheme === 'dark');
         } else {
           const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
           const initialTheme = prefersDark ? 'dark' : 'light';
           setTheme(initialTheme);
           localStorage.setItem('theme', initialTheme);
           document.documentElement.classList.toggle('dark', prefersDark);
         }
         
         const storedUser = authService.getCurrentUser();
         if (storedUser) {
           setUser(storedUser);
         }
       } catch (error) {
         console.error('Error al inicializar la aplicación:', error);
         authService.logout();
       } finally {
         setLoading(false);
       }
     };
     initializeApp();
   }, []);
 
   const login = async (credentials: LoginCredentials) => {
     try {
       const loggedUser = await authService.login(credentials);
       setUser(loggedUser);
       router.push('/dashboard');
     } catch (error) {
       console.error('Fallo en el login desde AuthContext:', error);
       throw error; 
     }
   };
 
   const logout = () => {
     authService.logout();
     setUser(null);
     router.push('/login');
   };
 
   const updateProfile = useCallback(async (userData: Partial<User>): Promise<User> => {
     if (!user) throw new Error("Usuario no autenticado");
 
     const updatedUser = { ...user, ...userData };
     
     setUser(updatedUser);
     localStorage.setItem('user', JSON.stringify(updatedUser));
     return updatedUser;
   }, [user]);
 
   const toggleTheme = useCallback(() => {
     setTheme((prevTheme) => {
       const newTheme = prevTheme === 'light' ? 'dark' : 'light';
       localStorage.setItem('theme', newTheme);
       document.documentElement.classList.toggle('dark', newTheme === 'dark');
       return newTheme;
     });
   }, []);
 
   if (loading) {
     return <LoadingSpinner fullScreen message="Cargando sistema..." />;
   }
 
   const value: AuthContextType = {
     user,
     isAuthenticated: !!user,
     loading,
     theme,
     login,
     logout,
     updateProfile,
     toggleTheme,
   };
 
   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
 };
 
 /**
  * @hook useAuth
  * @description Hook personalizado para consumir el AuthContext de forma segura.
  * @returns {AuthContextType} El valor del contexto de autenticación.
  * @throws {Error} Si se usa fuera de un AuthProvider.
  */
 export const useAuth = (): AuthContextType => {
   const context = useContext(AuthContext);
   if (context === undefined) {
     throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
   }
   return context;
 };