/**
 * @file withAuth.tsx
 * @description HOC (Higher-Order Component) para proteger rutas basadas en el estado de
 * autenticación y opcionalmente en roles de usuario.
 */
 'use client';

 import { useEffect } from 'react';
 import { useRouter } from 'next/navigation';
 import { useAuth } from '@/context/AuthContext';
 import { LoadingSpinner } from '@/components/common/LoadingSpinner';
 import { Role } from '@/types'; 
 
 interface WithAuthOptions {
   roles?: Role[];
 }
 
 /**
  * @hoc withAuth
  * @description Un HOC que protege un componente. Redirige a /login si el usuario no está
  * autenticado o a una página de no autorizado si no tiene el rol requerido.
  * @param {React.ComponentType<P>} WrappedComponent - El componente a proteger.
  * @param {WithAuthOptions} [options] - Opciones de autorización, como los roles permitidos.
  * @returns {React.ComponentType<P>} El componente envuelto con la lógica de autenticación.
  */
 export function withAuth<P extends object>(
   WrappedComponent: React.ComponentType<P>,
   options?: WithAuthOptions
 ) {
   const AuthComponent = (props: P) => {
     const { isAuthenticated, user, loading } = useAuth();
     const router = useRouter();
 
     useEffect(() => {
       if (loading) return; 
 
       if (!isAuthenticated) {
         router.replace('/login');
         return;
       }
 
       if (options?.roles && user) {
         const hasRequiredRole = options.roles.includes(user.role);
         if (!hasRequiredRole) {
           router.replace('/unauthorized'); 
         }
       }
     }, [isAuthenticated, user, loading, router, options?.roles]);
 
     const isAuthorized = !options?.roles || (user && options.roles.includes(user.role));
     if (loading || !isAuthenticated || !isAuthorized) {
       return <LoadingSpinner fullScreen message="Verificando autorización..." />;
     }
 
     return <WrappedComponent {...props} />;
   };
   
   AuthComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
 
   return AuthComponent;
 }