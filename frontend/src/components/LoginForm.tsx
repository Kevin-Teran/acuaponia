/**
 * @file LoginForm.tsx
 * @description Componente de formulario de login con validaciones avanzadas, manejo de errores
 * y experiencia de usuario optimizada para el sistema de acuaponía.
 * @author Sistema de Acuaponía SENA
 * @version 3.0.0
 * @since 1.0.0
 */

'use client'; 

import React, { 
  useState, 
  FormEvent, 
  useCallback, 
  useEffect, 
  useMemo 
} from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  UserCheck, 
  Sun, 
  Moon, 
  AlertTriangle, 
  X,
  Shield,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { LoginCredentials, AuthError, Role } from '@/types';

/**
 * @typedef {Object} FormErrors
 * @description Errores de validación específicos por campo
 * @property {string} email - Error del campo email
 * @property {string} password - Error del campo password
 * @property {string} general - Error general del formulario
 */
interface FormErrors {
  /** Error del campo email */
  email?: string;
  /** Error del campo password */
  password?: string;
  /** Error general del formulario */
  general?: string;
}

/**
 * @typedef {Object} DemoAccount
 * @description Cuenta demo para testing y demostración
 * @property {string} email - Email de la cuenta demo
 * @property {string} password - Contraseña de la cuenta demo
 * @property {string} role - Rol de la cuenta demo
 * @property {string} description - Descripción de la cuenta
 */
interface DemoAccount {
  /** Email de la cuenta demo */
  email: string;
  /** Contraseña de la cuenta demo */
  password: string;
  /** Rol de la cuenta demo */
  role: string;
  /** Descripción de la cuenta */
  description: string;
}

/**
 * @typedef {Object} LoginAttempt
 * @description Información sobre intentos de login para prevenir ataques
 * @property {number} count - Número de intentos fallidos
 * @property {number} lastAttempt - Timestamp del último intento
 * @property {boolean} locked - Si está temporalmente bloqueado
 */
interface LoginAttempt {
  /** Número de intentos fallidos */
  count: number;
  /** Timestamp del último intento */
  lastAttempt: number;
  /** Si está temporalmente bloqueado */
  locked: boolean;
}

/**
 * @class LoginForm
 * @description Componente principal del formulario de login con funcionalidades avanzadas.
 * Incluye validación en tiempo real, manejo de errores, cuentas demo y protección contra ataques.
 */
export const LoginForm: React.FC = React.memo(() => {
  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Estados para control de intentos
  const [loginAttempts, setLoginAttempts] = useState<LoginAttempt>({
    count: 0,
    lastAttempt: 0,
    locked: false
  });

  // Hooks personalizados
  const { login, loading, error: authError, theme, toggleTheme, isAuthenticated } = useAuth();
  const router = useRouter();

  /**
   * @constant {DemoAccount[]} demoAccounts
   * @description Cuentas de demostración disponibles para testing
   */
  const demoAccounts: DemoAccount[] = useMemo(() => [
    { 
      email: 'admin@sena.edu.co', 
      password: '123456', 
      role: 'Administrador',
      description: 'Acceso completo al sistema - Gestión de usuarios, configuración y reportes avanzados'
    },
    { 
      email: 'usuario@sena.edu.co', 
      password: '123456', 
      role: 'Usuario',
      description: 'Acceso limitado - Monitoreo de tanques asignados y generación de reportes básicos'
    },
  ], []);

  /**
   * @method validateEmail
   * @description Valida el formato del email usando expresiones regulares.
   * @param {string} email - Email a validar
   * @returns {boolean} true si el email es válido
   * @private
   * @example
   * const isValid = validateEmail('user@sena.edu.co'); // returns true
   */
  const validateEmail = useCallback((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }, []);

  /**
   * @method validatePassword
   * @description Valida que la contraseña cumpla con requisitos mínimos.
   * @param {string} password - Contraseña a validar
   * @returns {boolean} true si la contraseña es válida
   * @private
   */
  const validatePassword = useCallback((password: string): boolean => {
    return password.length >= 6;
  }, []);

  /**
   * @method validateForm
   * @description Valida todos los campos del formulario y actualiza errores.
   * @returns {boolean} true si el formulario es válido
   * @private
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Validar email
    if (!email.trim()) {
      newErrors.email = 'El correo electrónico es obligatorio';
    } else if (!validateEmail(email)) {
      newErrors.email = 'El formato del correo electrónico no es válido';
    }

    // Validar contraseña
    if (!password.trim()) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (!validatePassword(password)) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    // Verificar si está bloqueado por intentos fallidos
    if (loginAttempts.locked) {
      const timeLeft = Math.ceil((loginAttempts.lastAttempt + 15 * 60 * 1000 - Date.now()) / 1000 / 60);
      if (timeLeft > 0) {
        newErrors.general = `Cuenta temporalmente bloqueada. Intente nuevamente en ${timeLeft} minutos.`;
      } else {
        // Desbloquear si ya pasó el tiempo
        setLoginAttempts({ count: 0, lastAttempt: 0, locked: false });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password, validateEmail, validatePassword, loginAttempts]);

  /**
   * @method handleInputChange
   * @description Factory function para crear handlers de cambio de input con limpieza de errores.
   * @param {React.Dispatch<React.SetStateAction<string>>} setter - Función setter del estado
   * @param {keyof FormErrors} field - Campo asociado para limpiar error
   * @returns {Function} Handler de cambio de input
   * @private
   */
  const handleInputChange = useCallback((
    setter: React.Dispatch<React.SetStateAction<string>>,
    field: keyof FormErrors
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    // Limpiar error específico del campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  /**
   * @method handleSubmit
   * @description Maneja el envío del formulario con validaciones y manejo de errores.
   * @param {FormEvent<HTMLFormElement>} e - Evento del formulario
   * @returns {Promise<void>} Promesa que se resuelve al completar el proceso
   * @throws {AuthError} Error de autenticación si las credenciales son incorrectas
   * @example
   * <form onSubmit={handleSubmit}>
   *   // campos del formulario
   * </form>
   */
  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    // Prevenir envíos múltiples
    if (isSubmitting || loading) return;

    // Validar formulario
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const credentials: LoginCredentials = { 
        email: email.trim().toLowerCase(), 
        password, 
        rememberMe 
      };

      await login(credentials);
      
      // Mostrar mensaje de éxito brevemente
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 2000);

      // Limpiar intentos fallidos en caso de éxito
      setLoginAttempts({ count: 0, lastAttempt: 0, locked: false });

    } catch (err) {
      const authError = err as AuthError;
      
      // Incrementar contador de intentos fallidos
      const newCount = loginAttempts.count + 1;
      const shouldLock = newCount >= 5;
      
      setLoginAttempts({
        count: newCount,
        lastAttempt: Date.now(),
        locked: shouldLock
      });

      // Mostrar error específico
      if (authError.type === 'VALIDATION_ERROR') {
        setErrors({ general: authError.message });
      } else if (authError.type === 'UNAUTHORIZED') {
        setErrors({ 
          general: `Credenciales incorrectas. ${shouldLock ? 'Cuenta bloqueada por 15 minutos.' : `Intentos restantes: ${5 - newCount}`}` 
        });
      } else {
        setErrors({ 
          general: authError.message || 'Error inesperado durante el inicio de sesión' 
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, loading, validateForm, email, password, rememberMe, login, loginAttempts]);

  /**
   * @method handleDemoLogin
   * @description Rellena el formulario con credenciales de una cuenta demo.
   * @param {string} demoEmail - Email de la cuenta demo
   * @param {string} demoPassword - Contraseña de la cuenta demo
   * @example
   * handleDemoLogin('admin@sena.edu.co', '123456');
   */
  const handleDemoLogin = useCallback((demoEmail: string, demoPassword: string): void => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setRememberMe(true);
    setErrors({});
    setLoginAttempts({ count: 0, lastAttempt: 0, locked: false });
  }, []);

  /**
   * @method clearAllErrors
   * @description Limpia todos los errores del formulario.
   */
  const clearAllErrors = useCallback((): void => {
    setErrors({});
  }, []);

  // Efecto para redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Efecto para limpiar errores de auth context
  useEffect(() => {
    if (authError) {
      setErrors({ general: authError.message });
    }
  }, [authError]);

  // Render del componente
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-all duration-500">
      
      {/* Botón de cambio de tema */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 shadow-lg"
          aria-label={`Cambiar a tema ${theme === 'light' ? 'oscuro' : 'claro'}`}
        >
          {theme === 'light' ? 
            <Moon size={20} className="text-gray-700" /> : 
            <Sun size={20} className="text-yellow-400" />
          }
        </button>
      </div>

      {/* Mensaje de éxito */}
      {showSuccessMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-2 duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <CheckCircle size={20} />
            <span>¡Inicio de sesión exitoso!</span>
          </div>
        </div>
      )}

      {/* Contenedor principal */}
      <main className="w-full max-w-md animate-in fade-in slide-in-from-bottom-5 duration-500">
        
        {/* Header con logo y título */}
        <header className="text-center mb-8">
          <div className="relative mb-4">
            <Image
              src="/logo-sena.png"
              alt="Logo del SENA, Servicio Nacional de Aprendizaje de Colombia"
              width={80}
              height={80}
              className="mx-auto drop-shadow-lg"
              style={{ height: 'auto' }}
              priority
            />
            <div className="absolute -top-1 -right-1">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sistema de Monitoreo de Acuaponía
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Servicio Nacional de Aprendizaje (SENA)
          </p>
          <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Versión 3.0.0 • Seguridad Avanzada
          </div>
        </header>

        {/* Formulario principal */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-200/50 dark:border-gray-700/50">
          
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            
            {/* Campo de email */}
            <div>
              <label 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" 
                htmlFor="email"
              >
                Correo Electrónico
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={handleInputChange(setEmail, 'email')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.email 
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  }`}
                  placeholder="usuario@sena.edu.co" 
                  required 
                  autoComplete="email"
                  disabled={isSubmitting || loading}
                />
                {errors.email && (
                  <AlertTriangle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 w-5 h-5" />
                )}
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* Campo de contraseña */}
            <div>
              <label 
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" 
                htmlFor="password"
              >
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'} 
                  value={password} 
                  onChange={handleInputChange(setPassword, 'password')}
                  className={`w-full pl-10 pr-12 py-3 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                    errors.password 
                      ? 'border-red-300 bg-red-50 dark:bg-red-900/20' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                  }`}
                  placeholder="Mínimo 6 caracteres" 
                  required 
                  autoComplete="current-password"
                  disabled={isSubmitting || loading}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" 
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  disabled={isSubmitting || loading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{errors.password}</span>
                </p>
              )}
            </div>

            {/* Checkbox recordar sesión */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input 
                  id="remember-me" 
                  type="checkbox" 
                  checked={rememberMe} 
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded transition-colors"
                  disabled={isSubmitting || loading}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Recordar por 7 días
                </label>
              </div>
              
              {/* Indicador de intentos */}
              {loginAttempts.count > 0 && !loginAttempts.locked && (
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  Intentos: {loginAttempts.count}/5
                </div>
              )}
            </div>

            {/* Error general */}
            {errors.general && (
              <div className="bg-red-100/80 dark:bg-red-900/50 border border-red-400/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative flex items-center justify-between animate-in slide-in-from-top-2 duration-300" role="alert">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{errors.general}</span>
                </div>
                <button 
                  type="button" 
                  onClick={clearAllErrors} 
                  aria-label="Cerrar alerta"
                  className="hover:bg-red-200 dark:hover:bg-red-800 rounded p-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Botón de envío */}
            <button 
              type="submit" 
              disabled={isSubmitting || loading || loginAttempts.locked} 
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isSubmitting || loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              <span>
                {isSubmitting || loading ? 'Ingresando...' : 'Iniciar Sesión'}
              </span>
            </button>
          </form>

          {/* Sección de cuentas demo */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-4">
              O prueba con una cuenta de demostración:
            </p>
            <div className="space-y-3">
              {demoAccounts.map((account) => (
                <button 
                  key={account.email}
                  onClick={() => handleDemoLogin(account.email, account.password)} 
                  disabled={isSubmitting || loading}
                  className="w-full flex items-start text-left p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed border border-transparent hover:border-green-200 dark:hover:border-green-700"
                >
                  <UserCheck className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {account.email}
                      </p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        account.role === 'Administrador' 
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      }`}>
                        {account.role}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {account.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8 space-y-1">
          <p>© {new Date().getFullYear()} SENA - Todos los derechos reservados</p>
          <p>Desarrollado por Kevin Mariano • Sistema de Acuaponía Inteligente</p>
          <div className="flex justify-center space-x-4 mt-2">
            <span>🔒 Conexión Segura</span>
            <span>🛡️ Datos Protegidos</span>
          </div>
        </footer>
      </main>
    </div>
  );
});

LoginForm.displayName = 'LoginForm';