@@ .. @@
 import { useState, useEffect } from 'react';
+import { authAPI } from '../config/api';
+import socketService from '../services/socketService';
 import { User, AuthState } from '../types';

-// Mock de autenticación para demostración
-const mockUsers: User[] = [
-  { 
-    id: '1', 
-    email: 'admin@sena.edu.co', 
-    role: 'admin', 
-    name: 'Administrador',
-    createdAt: '2024-01-15T10:00:00Z',
-    lastLogin: '2024-12-20T14:30:00Z',
-    status: 'active'
-  },
-  { 
-    id: '2', 
-    email: 'usuario@sena.edu.co', 
-    role: 'user', 
-    name: 'Usuario',
-    createdAt: '2024-02-01T09:15:00Z',
-    lastLogin: '2024-12-19T16:45:00Z',
-    status: 'active'
-  },
-];
-
 export const useAuth = () => {
   const [authState, setAuthState] = useState<AuthState>({
     user: null,
@@ .. @@
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
+        
+        // Conectar Socket.IO
+        socketService.connect(savedToken);
+        
+        // Verificar token con el servidor
+        authAPI.getMe().catch(() => {
+          // Token inválido, limpiar
+          localStorage.removeItem('acuaponia_token');
+          localStorage.removeItem('acuaponia_user');
+          setAuthState({
+            user: null,
+            token: null,
+            isAuthenticated: false,
+          });
+        });
       } catch (error) {
         localStorage.removeItem('acuaponia_token');
         localStorage.removeItem('acuaponia_user');
       }
     }
     
     setLoading(false);
   }, []);

   const login = async (email: string, password: string): Promise<boolean> => {
     setLoading(true);
     
-    // Simulación de llamada a API
-    await new Promise(resolve => setTimeout(resolve, 1000));
-    
-    const user = mockUsers.find(u => u.email === email);
-    
-    if (user && password === '123456') { // Password demo
-      const token = `mock-jwt-token-${user.id}-${Date.now()}`;
+    try {
+      const response = await authAPI.login(email, password);
+      const { token, user } = response.data;
       
       setAuthState({
         user,
@@ .. @@
       localStorage.setItem('acuaponia_token', token);
       localStorage.setItem('acuaponia_user', JSON.stringify(user));
       
+      // Conectar Socket.IO
+      socketService.connect(token);
+      
       setLoading(false);
       return true;
+    } catch (error: any) {
+      console.error('Error en login:', error);
+      setLoading(false);
+      return false;
     }
-    
-    setLoading(false);
-    return false;
   };

   const logout = () => {
     setAuthState({
@@ .. @@
     
     localStorage.removeItem('acuaponia_token');
     localStorage.removeItem('acuaponia_user');
+    
+    // Desconectar Socket.IO
+    socketService.disconnect();
+  };
+
+  const updateProfile = async (profileData: Partial<User>) => {
+    try {
+      if (authState.user) {
+        const updatedUser = { ...authState.user, ...profileData };
+        setAuthState(prev => ({
+          ...prev,
+          user: updatedUser
+        }));
+        localStorage.setItem('acuaponia_user', JSON.stringify(updatedUser));
+      }
+    } catch (error) {
+      console.error('Error actualizando perfil:', error);
+    }
   };

   return {
     ...authState,
     loading,
     login,
     logout,
+    updateProfile,
   };
 };