/**
 * @file ForgotPasswordForm.tsx
 * @description
 * Componente de UI para el formulario de solicitud de restablecimiento de contraseña.
 * Mantiene la coherencia visual con el LoginForm, incluyendo soporte para temas.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */
'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { User, Mail, Send, Sun, Moon, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/authService';

/**
 * @function ForgotPasswordForm
 * @description
 * Componente que renderiza un formulario para que los usuarios introduzcan su
 * correo electrónico y soliciten un enlace de recuperación de contraseña.
 * @returns {JSX.Element} El componente React del formulario.
 */
export const ForgotPasswordForm: React.FC = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { theme, toggleTheme } = useAuth();

    /**
     * @description Aplica la clase 'dark' al <html> según el tema.
     */
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    /**
     * @description Maneja el envío del formulario.
     * @param {FormEvent<HTMLFormElement>} e - El evento del formulario.
     */
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Por favor, ingrese su correo electrónico.');
            return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('El formato del correo electrónico no es válido.');
            return;
        }
        
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const response = await authService.forgotPassword(email);
            setSuccessMessage(response.message);
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error. Por favor, intente de nuevo.');
        } finally {
            setLoading(false);
        }
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
                    <Image
                        src="/logo-sena.png"
                        alt="Logo del SENA"
                        width={70}
                        height={70}
                        className="mx-auto mb-3"
                        priority
                    />
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recuperar Contraseña</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ingrese su correo para recibir instrucciones</p>
                </header>

                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700/50">
                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">
                                Correo Electrónico Registrado
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500" placeholder="usuario@sena.edu.co" required />
                            </div>
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

                        {successMessage && (
                             <div className="bg-green-100/80 dark:bg-green-900/50 border border-green-400/50 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg relative flex items-center" role="alert">
                                <CheckCircle className="w-5 h-5 mr-3" />
                                <span className="block sm:inline text-sm">{successMessage}</span>
                            </div>
                        )}

                        <button type="submit" disabled={loading || !!successMessage} className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 rounded-lg flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed">
                            <Send className="w-5 h-5" />
                            <span>{loading ? 'Enviando...' : 'Enviar Enlace'}</span>
                        </button>
                    </form>
                    <div className="text-center mt-4">
                        <Link href="/login" className="text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                            Volver a Inicio de Sesión
                        </Link>
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