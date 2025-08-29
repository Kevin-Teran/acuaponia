/**
 * @file LoginForm.tsx
 * @description Componente de UI para el formulario de inicio de sesión.
 * Incluye un diseño visual atractivo con soporte para temas claro/oscuro.
 * @author Kevin Mariano
 * @version 5.0.0
 */
'use client';

import React, { useState, FormEvent, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { User, Lock, Eye, EyeOff, LogIn, UserCheck, Sun, Moon, AlertTriangle, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { LoginCredentials } from '@/types';

/**
 * @typedef {Object} LoginCredentials
 * @property {string} email - Correo electrónico del usuario.
 * @property {string} password - Contraseña del usuario.
 * @property {boolean} rememberMe - Opción para recordar la sesión.
 */

/**
 * @function LoginForm
 * @description Componente del formulario de inicio de sesión con validación y manejo de estado.
 * Incluye un diseño visual atractivo con soporte para temas claro/oscuro.
 * @returns {JSX.Element} El componente React del formulario de login.
 */
export const LoginForm: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const { login, loading, theme, toggleTheme, isAuthenticated } = useAuth();
    const router = useRouter();

    /**
     * @description Redirige al usuario al dashboard si ya está autenticado.
     */
    useEffect(() => {
        if (isAuthenticated) {
            router.replace('/dashboard');
        }
    }, [isAuthenticated, router]);

    /**
     * @description Aplica la clase 'dark' al elemento <html> según el tema actual y detecta el tema del sistema.
     */
    useEffect(() => {
        const storedTheme = localStorage.getItem('theme');
        const systemPreference = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const initialTheme = storedTheme || systemPreference;

        if (initialTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        } 
    }, [theme]);

    /**
     * @description Cuentas de demostración para facilitar el testing.
     * @constant {Array<Object>}
     */
    const demoAccounts = [
        { email: 'admin@sena.edu.co', password: '123456', role: 'Administrador' },
        { email: 'usuario@sena.edu.co', password: '123456', role: 'Usuario' },
    ];
    
    /**
     * @description Valida el formato del formulario antes de enviarlo.
     * @returns {boolean} True si el formulario es válido, de lo contrario, false.
     */
    const validateForm = useCallback((): boolean => {
        if (!email.trim() || !password.trim()) {
            setError('Por favor, ingrese su correo y contraseña.');
            return false;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('El formato del correo electrónico no es válido.');
            return false;
        }
        setError(null);
        return true;
    }, [email, password]);

    /**
     * @description Maneja el envío del formulario de inicio de sesión.
     * @param {FormEvent<HTMLFormElement>} e - El evento del formulario.
     */
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (loading || !validateForm()) return;
        try {
            await login({ email, password, rememberMe });
        } catch (err: any) {
            setError(err.message || 'Las credenciales proporcionadas son incorrectas.');
        }
    };
    
    /**
     * @description Inicia sesión automáticamente con una cuenta de demostración.
     * @param {string} demoEmail - El correo de la cuenta demo.
     * @param {string} demoPassword - La contraseña de la cuenta demo.
     */
    const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
        setEmail(demoEmail);
        setPassword(demoPassword);
        setRememberMe(true);
        setError(null);
    };

    /**
     * @description Maneja el cambio de los campos de entrada.
     * @param {React.Dispatch<React.SetStateAction<string>>} setter - La función de estado para el campo.
     * @returns {(e: React.ChangeEvent<HTMLInputElement>) => void} Una función que actualiza el estado.
     */
    const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setter(e.target.value);
        if (error) setError(null);
    };
    
    return (
        <div className="relative min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4 transition-colors duration-500">
            <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full bg-gray-200/50 dark:bg-gray-700/50 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                    aria-label="Cambiar tema"
                >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
            </div>

            <main className="w-full max-w-sm sm:max-w-md animate-in fade-in slide-in-from-bottom-5 duration-500 px-4 sm:px-0">
                <header className="text-center mb-6">
                    <div className="relative w-16 h-16 mx-auto mb-3">
                        <Image
                            src="/logo-sena.png"
                            alt="Logo del SENA, Servicio Nacional de Aprendizaje de Colombia"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sistema de Monitoreo de Acuaponía</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Servicio Nacional de Aprendizaje (SENA)</p>
                </header>

                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700/50">
                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        {/* Campos de Email y Contraseña */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input id="email" type="email" value={email} onChange={handleInputChange(setEmail)} className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500" placeholder="usuario@sena.edu.co" required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="password">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={handleInputChange(setPassword)} className="w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500" placeholder="Mínimo 6 caracteres" required />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <input id="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded" />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">Recordar sesión</label>
                        </div>
                        {error && (
                            <div className="bg-red-100/80 dark:bg-red-900/50 border border-red-400/50 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg relative flex items-center justify-between" role="alert">
                                <div className="flex items-center">
                                    <AlertTriangle className="w-5 h-5 mr-3" />
                                    <span className="block sm:inline text-sm">{error}</span>
                                </div>
                                <button type="button" onClick={() => setError(null)} aria-label="Cerrar alerta">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                        <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed">
                            <LogIn className="w-5 h-5" />
                            <span>Iniciar Sesión</span>
                        </button>
                    </form>
                    <div className="text-center mt-4">
                        <a href="/forgot-password" className="text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                            ¿Olvidaste tu contraseña?
                        </a>
                    </div>
                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-3">O ingresa con una cuenta demo:</p>
                        <div className="space-y-2">
                            {demoAccounts.map(account => (
                                <button key={account.email} onClick={() => handleDemoLogin(account.email, account.password)} className="w-full flex items-center text-left p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-colors">
                                    <UserCheck className="w-5 h-5 text-green-500 mr-3" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">{account.email}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{account.role}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <footer className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
                    <p>© {new Date().getFullYear()} SENA - Todos los derechos reservados</p>
                    <p>Desarrollado por Kevin Mariano</p>
                </footer>
            </main>
        </div>
    );
};