import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, UserCheck, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../../hooks/useAuth';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError(null);
    setIsLoading(true);

    try {
      const success = await login({ email, password });
      
      if (success) {
        setIsRedirecting(true);
        
        // Mostrar mensaje de bienvenida en la página de destino
        sessionStorage.setItem('showWelcomeMessage', 'true');
        
        // Redirigir después de 1.5 segundos (para mostrar la animación)
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1500);
      } else {
        setError('Error inesperado. Intenta de nuevo.');
      }
    } catch (error: any) {
      let errorMessage = 'Error desconocido';
      
      if (error?.response?.data) {
        errorMessage = error.response.data.error?.message || 
                      error.response.data.message || 
                      'Error del servidor';
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      await Swal.fire({
        icon: 'error',
        title: 'Error de Autenticación',
        text: errorMessage,
        confirmButtonText: 'Intentar de nuevo',
        confirmButtonColor: '#FF671F',
        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#374151',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError(null);
  };

  const demoAccounts = [
    { email: 'admin@sena.edu.co', password: '123456', role: 'Administrador' },
    { email: 'usuario@sena.edu.co', password: '123456', role: 'Usuario' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4 relative">
      {/* Overlay de carga durante redirección */}
      {isRedirecting && (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 bg-opacity-90 dark:bg-opacity-90 z-50 flex items-center justify-center transition-opacity duration-500">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <img 
                src="/logo-sena.png" 
                alt="Logo SENA" 
                className="h-24 w-auto animate-pulse"
              />
            </div>
            <div className="w-64 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mx-auto">
              <div className="bg-orange-500 h-2.5 rounded-full animate-progress"></div>
            </div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Cargando sistema...</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-md">
        {/* Cabecera */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 shadow-lg bg-white dark:bg-gray-800">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Sistema de Monitoreo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Acuaponía - Servicio Nacional de Aprendizaje
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">
                Correo Electrónico
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                  placeholder="usuario@sena.edu.co"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-200"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Botón de Envío */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Iniciar Sesión</span>
                </>
              )}
            </button>
          </form>

          {/* Estado de conexión */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isLoading ? '🔄 Conectando con el servidor...' : '✅ Listo para iniciar sesión'}
            </p>
          </div>

          {/* Cuentas de demostración */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 text-center">
              Cuentas de demostración:
            </p>
            <div className="space-y-2">
              {demoAccounts.map((account, index) => (
                <button
                  key={index}
                  onClick={() => handleDemoLogin(account.email, account.password)}
                  disabled={isLoading}
                  className="w-full flex justify-between items-center text-left p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-start space-x-3">
                    <UserCheck className="w-5 h-5 text-orange-500 mt-1" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{account.email}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{account.role}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {isLoading ? '⏳' : 'Usar'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pie de página */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} SENA - Todos los derechos reservados
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Backend: http://localhost:5001/api
          </p>
        </div>
      </div>
    </div>
  );
};