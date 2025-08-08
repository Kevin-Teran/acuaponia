import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';

/**
 * @component PublicRoute
 * @description Un componente que envuelve rutas públicas como el login. Si el usuario ya
 * está autenticado, lo redirige al dashboard para evitar que inicie sesión de nuevo.
 */
export const PublicRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen message="Verificando sesión..." />;
  }

  return isAuthenticated ? <Navigate to="/dashboard" /> : <Outlet />;
};