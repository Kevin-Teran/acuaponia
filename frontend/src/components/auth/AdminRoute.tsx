import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';

/**
 * @component AdminRoute
 * @description Un componente de ruta que protege su contenido, permitiendo el acceso
 * únicamente a usuarios que estén autenticados Y que tengan el rol de 'ADMIN'.
 * Si el usuario no es admin, lo redirige al dashboard.
 */
export const AdminRoute: React.FC = () => {
  const { isAuthenticated, user, loading } = useAuth();

  // 1. Muestra un spinner mientras se verifica el estado de autenticación.
  if (loading) {
    return <LoadingSpinner fullScreen message="Verificando permisos..." />;
  }

  // 2. Si el usuario está autenticado y su rol es 'ADMIN', permite el acceso.
  if (isAuthenticated && user?.role === 'ADMIN') {
    return <Outlet />;
  }

  // 3. Si el usuario está autenticado pero NO es 'ADMIN', lo redirige al dashboard.
  if (isAuthenticated) {
    // Redirigir a una página segura para evitar que vea contenido no autorizado.
    return <Navigate to="/dashboard" replace />;
  }

  // 4. Si no está autenticado, lo redirige a la página de login (esto es una salvaguarda).
  return <Navigate to="/login" replace />;
};