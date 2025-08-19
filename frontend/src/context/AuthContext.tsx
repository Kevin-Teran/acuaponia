/**
 * @file AuthContext.tsx
 * @description Proveedor de contexto para gestionar el estado de autenticación global.
 * Este archivo centraliza la lógica de usuario, estado de autenticación, y las funciones
 * de `login` y `logout`, y exporta el hook `useAuth` para un consumo fácil y seguro.
 */
 'use client';

 import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
 import { useRouter } from 'next/navigation';
 import * as authService from '@/services/authService';
 import * as userService from '@/services/userService';
 import { User, LoginCredentials } from '@/types';
 import { LoadingSpinner } from '@/components/common/LoadingSpinner';
 
 /**
  * @interface AuthContextType
  * @description Define la forma de los datos que el contexto de autenticación proveerá.
  */
 interface AuthContextType {
   user: User | null;
   isAuthenticated: boolean;
   loading: boolean;
   login: (credentials: LoginCredentials) => Promise<void>;
   logout: () => void;
   updateProfile: (userData: Partial<User>) => Promise<User>;
 }
 
 const AuthContext = createContext<AuthContextType | undefined>(undefined);
 
 /**
  * @provider AuthProvider
  * @description Componente proveedor que envuelve la aplicación.
  * Gestiona el estado de autenticación y lo expone al resto de la app.
  */
 export const AuthProvider = ({ children }: { children: ReactNode }) => {
   const [user, setUser] = useState<User | null>(null);
   const [loading, setLoading] = useState(true);
   const router = useRouter();
 
   useEffect(() => {
     const checkUserSession = () => {
       try {
         const storedUser = authService.getCurrentUser();
         const token = localStorage.getItem('token');
         if (storedUser && token) {
           setUser(storedUser);
         }
       } catch (error) {
         console.error('Error al verificar la sesión del usuario:', error);
         authService.logout();
       } finally {
         setLoading(false);
       }
     };
     checkUserSession();
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
 
     try {
       const updatedUser = await userService.updateUser(user.id, userData);
       const finalUser = { ...user, ...updatedUser };
       setUser(finalUser);
       localStorage.setItem('user', JSON.stringify(finalUser));
       return finalUser;
     } catch (error) {
       console.error('Error actualizando el perfil:', error);
       throw error;
     }
   }, [user]);
 
   if (loading) {
     return <LoadingSpinner fullScreen message="Verificando sesión..." />;
   }
 
   const value: AuthContextType = {
     user,
     isAuthenticated: !!user,
     loading,
     login,
     logout,
     updateProfile,
   };
 
   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
 };
 
 /**
  * @hook useAuth
  * @description Hook personalizado para consumir el AuthContext de forma segura en los componentes.
  * Lanza un error si se intenta usar fuera de un AuthProvider.
  * @returns {AuthContextType} El valor actual del contexto de autenticación.
  */
 export const useAuth = (): AuthContextType => {
   const context = useContext(AuthContext);
   if (context === undefined) {
     throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
   }
   return context;
 };