import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginForm } from './components/auth/LoginForm';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicRoute } from './components/auth/PublicRoute';
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
 * Utiliza rutas públicas y protegidas para gestionar el acceso de forma segura y eficiente.
 */
function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner fullScreen />}>
        <Routes>
          {/* GRUPO DE RUTAS PÚBLICAS */}
          {/* Si el usuario está logueado, lo redirige a /dashboard */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginForm />} />
          </Route>

          {/* GRUPO DE RUTAS PROTEGIDAS */}
          {/* Si el usuario NO está logueado, lo redirige a /login */}
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
 * @description Define las sub-rutas de la aplicación principal que se renderizan
 * dentro del layout principal (con Sidebar).
 */
const MainAppRoutes = () => {
  const { user, logout } = useAuth();

 
  if (!user) {
    return <LoadingSpinner fullScreen message="Cargando..." />;
  }

  return (
    <AppLayout user={user} onLogout={logout}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/data-entry" element={<DataEntry />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/sensors" element={<Sensors />} />
        <Route path="/settings" element={<Settings />} />
        
        {/* Cualquier otra ruta redirige al dashboard por defecto */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </AppLayout>
  );
};

export default App;