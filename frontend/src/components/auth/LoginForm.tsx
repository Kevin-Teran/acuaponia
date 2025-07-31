import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, UserCheck } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../../hooks/useAuth';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  
  const senaGreen = '#39A900';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true); 

    try {
      await login({ email, password, rememberMe });
      
      
      sessionStorage.setItem('showWelcomeMessage', 'true');
      
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1200);

    } catch (error: any) {
      setIsLoading(false); 
      
      const errorMessage = error?.response?.data?.message || error?.message || 'Error de autenticación. Por favor, verifica tus credenciales.';
      
      await Swal.fire({
        icon: 'error',
        title: 'Error de Autenticación',
        text: errorMessage,
        confirmButtonText: 'Intentar de nuevo',
        confirmButtonColor: senaGreen,
        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#ffffff' : '#374151',
      });
    }
  };

  const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  const demoAccounts = [
    { email: 'admin@sena.edu.co', password: '123456', role: 'Administrador' },
    { email: 'usuario@sena.edu.co', password: '123456', role: 'Usuario' }
  ];

  if (isLoading) {
    return (
      <LoadingSpinner 
        fullScreen 
        size="lg" 
        message="Cargando..." 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-black flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-5 duration-500">
        {/* Cabecera */}
        <div className="text-center mb-8">
          <img 
            src="/logo-sena.png" 
            alt="Logo SENA" 
            className="w-20 h-20 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Sistema de Monitoreo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Acuaponía - Servicio Nacional de Aprendizaje
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700/50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">
                Correo Electrónico
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition"
                  placeholder="usuario@sena.edu.co"
                  required
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="password">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white transition"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Recordar sesión */}
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Recordar mi sesión
              </label>
            </div>

            {/* Botón de Envío */}
            <button
              type="submit"
              disabled={!email || !password}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-green-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogIn className="w-5 h-5" />
              <span>Iniciar Sesión</span>
            </button>
          </form>

          {/* Cuentas de demostración */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-3">Cuentas de demostración:</p>
            <div className="space-y-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  onClick={() => handleDemoLogin(account.email, account.password)}
                  className="w-full flex items-center text-left p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors"
                >
                  <UserCheck className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                  <div className="flex-grow">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{account.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{account.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pie de página */}
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
          © {new Date().getFullYear()} SENA - Todos los derechos reservados
        </p>
      </div>
    </div>
  );
};