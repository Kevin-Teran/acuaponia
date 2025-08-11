import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginForm } from './components/auth/LoginForm';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicRoute } from './components/auth/PublicRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './components/modules/Dashboard';
import { Reports } from './components/modules/Reports';
import { Predictions } from './components/modules/Predictions';
import { DataEntry } from './components/modules/DataEntry';
import { Analytics } from './components/modules/Analytics';
import { Settings } from './components/modules/Settings';
import { UserManagement } from './components/modules/UserManagement';
import { Sensors } from './components/modules/Sensors';
import { LoadingSpinner } from './components/common/LoadingSpinner';

/**
 * @component App
 * @description Componente principal que define la estructura de enrutamiento de la aplicación.
 */
function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
          {/* GRUPO DE RUTAS PÚBLICAS (Login) */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginForm />} />
          </Route>

          {/* GRUPO DE RUTAS PROTEGIDAS (Para todos los usuarios logueados) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<MainAppRoutes />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

/**
 * @component MainAppRoutes
 * @description Define las sub-rutas que se renderizan dentro del layout principal.
 */
const MainAppRoutes = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return <LoadingSpinner fullScreen message="Cargando datos de usuario..." />;
  }

  return (
    <AppLayout user={user} onLogout={logout}>
      <Routes>
        {/* Rutas para todos los usuarios autenticados */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/sensors" element={<Sensors />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* ▼▼▼ ZONA DE RUTAS SOLO PARA ADMINISTRADORES ▼▼▼ */}
        <Route element={<AdminRoute />}>
          <Route path="/users" element={<UserManagement />} />
          <Route path="/data-entry" element={<DataEntry />} />
          {/* Aquí puedes añadir cualquier otra ruta que sea solo para administradores */}
        </Route>
        
        {/* Redirección por defecto si ninguna ruta coincide */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </AppLayout>
  );
};

export default App;