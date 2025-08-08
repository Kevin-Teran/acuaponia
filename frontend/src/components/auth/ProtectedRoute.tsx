import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';

/**
 * @component ProtectedRoute
 * @description Un componente que envuelve rutas privadas. Si el usuario está autenticado,
 * renderiza el contenido de la ruta. De lo contrario, lo redirige a la página de login.
 * También maneja el estado de carga inicial de la autenticación.
 */
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen message="Verificando sesión..." />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};