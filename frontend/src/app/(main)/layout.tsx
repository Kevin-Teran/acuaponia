/**
 * @file layout.tsx
 * @description Layout principal para las rutas protegidas de la aplicación.
 * Actúa como un guardián (ProtectedRoute), verificando la autenticación
 * antes de renderizar cualquier página hija. Muestra la barra lateral
 * y la estructura principal de la aplicación.
 */
 'use client';

 import { useEffect } from 'react';
 import { useRouter } from 'next/navigation';
 import { useAuth } from '@/context/AuthContext';
 import { LoadingSpinner } from '@/components/common/LoadingSpinner';
 // import { Sidebar } from '@/components/layout/Sidebar'; // Descomentar cuando el Sidebar esté listo
 
 /**
  * @component MainAppLayout
  * @description Envuelve las páginas protegidas, gestiona la redirección de
  * usuarios no autenticados y renderiza la UI principal de la aplicación.
  * @param {{ children: React.ReactNode }} props Los componentes hijos (páginas).
  * @returns {React.ReactElement | null} El layout de la aplicación o nada durante la redirección.
  */
 export default function MainAppLayout({ children }: { children: React.ReactNode }) {
   const { isAuthenticated, loading, user, logout } = useAuth();
   const router = useRouter();
 
   useEffect(() => {
     if (!loading && !isAuthenticated) {
       router.replace('/login');
     }
   }, [isAuthenticated, loading, router]);
 
   if (loading) {
     return <LoadingSpinner fullScreen message="Cargando sesión..." />;
   }
 
   if (!isAuthenticated) {
     return null; 
   }
 
   return (
     <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
       {/* <Sidebar user={user} onLogout={logout} /> */}
       <aside className="w-64 bg-white dark:bg-gray-800 p-4 shadow-md">
         <h1 className="text-xl font-bold text-gray-900 dark:text-white">App Layout</h1>
         <p className="text-sm text-gray-500 dark:text-gray-400">Bienvenido, {user?.name}</p>
         <button onClick={logout} className="mt-4 text-red-500">Cerrar Sesión</button>
       </aside>
 
       <main className="flex-1 overflow-y-auto p-6">
         {children}
       </main>
     </div>
   );
 }