/**
 * @file AuthContext.tsx
 * @description Proveedor de contexto para gestionar el estado de autenticación en toda la aplicación.
 * @author Sistema de Acuaponía SENA
 * @version 1.1.0
 * @since 1.0.0
 */

 'use client';

 import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
 import { User } from '@/types';
 import { getCurrentUser, login as apiLogin, logout as apiLogout } from '@/services/authService';
 import { useRouter } from 'next/navigation';
 
 interface AuthContextType {
   user: User | null;
   isAuthenticated: boolean;
   isLoading: boolean;
   login: (credentials: any) => Promise<void>;
   logout: () => Promise<void>;
 }
 
 const AuthContext = createContext<AuthContextType | undefined>(undefined);
 
 export const AuthProvider = ({ children }: { children: ReactNode }) => {
   const [user, setUser] = useState<User | null>(null);
   const [isLoading, setIsLoading] = useState(true);
   const router = useRouter();
 
   useEffect(() => {
     const initializeApp = async () => {
       try {
         // La cookie httpOnly se envía automáticamente. Si tenemos una sesión válida,
         // esta llamada devolverá los datos del usuario.
         const currentUser = await getCurrentUser();
         setUser(currentUser);
       } catch (error) {
         // Si hay un error (ej. 401 Unauthorized), significa que no hay sesión válida.
         setUser(null);
       } finally {
         setIsLoading(false);
       }
     };
     initializeApp();
   }, []);
 
   const login = async (credentials: any) => {
     const { user: loggedInUser } = await apiLogin(credentials);
     setUser(loggedInUser);
     router.push('/dashboard');
   };
 
   const logout = async () => {
     await apiLogout();
     setUser(null);
     router.push('/login');
   };
 
   const value = {
     user,
     isAuthenticated: !!user,
     isLoading,
     login,
     logout,
   };
 
   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
 };
 
 export const useAuth = () => {
   const context = useContext(AuthContext);
   if (context === undefined) {
     throw new Error('useAuth debe ser usado dentro de un AuthProvider');
   }
   return context;
 };