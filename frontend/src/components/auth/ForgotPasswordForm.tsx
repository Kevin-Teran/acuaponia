/**
 * @file ForgotPasswordForm.tsx
 * @route frontend/src/components/auth
 * @description
 * Componente de UI para el formulario de solicitud de restablecimiento de contraseña.
 * @author Kevin Mariano
 * @version 1.1.1
 * @since 1.0.0
 * @copyright SENA 2025
*/

'use client';

import React, { useState, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Mail, Send, Sun, Moon, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { useTheme } from '@/context/ThemeContext';

export const ForgotPasswordForm: React.FC = () => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { theme, toggleTheme } = useTheme();
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
            // @ts-ignore
            setSuccessMessage(response.message);
        } catch (err: any)
{
            setError(err.message || 'Ocurrió un error. Por favor, intente de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 transition-colors duration-500 dark:bg-gray-900">
            <div className="absolute top-4 right-4 z-10">
                <button
                    onClick={toggleTheme}
                    className="rounded-full bg-gray-200/50 p-2 transition-all hover:bg-gray-300 dark:bg-gray-700/50 dark:hover:bg-gray-600"
                    aria-label="Cambiar tema"
                >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
            </div>

            <main className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-500 sm:max-w-md sm:px-0">
                <header className="mb-6 text-center">
                    <div className="relative mx-auto mb-3 h-16 w-16">
                        <Image
                            src="/logo-sena.png"
                            alt="Logo del SENA"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recuperar Contraseña</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ingrese su correo para recibir instrucciones</p>
                </header>

                <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-800/80">
                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="email">
                                Correo Electrónico Registrado
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <input 
                                    id="email" 
                                    type="email" 
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500" 
                                    placeholder="usuario@sena.edu.co" 
                                    required 
                                />
                            </div>
                        </div>

                        {/* ... (el resto del formulario no cambia) ... */}
                        {error && (
                            <div className="relative flex items-center justify-between rounded-lg border border-red-400/50 bg-red-100/80 px-4 py-3 text-red-700 dark:bg-red-900/50 dark:text-red-300" role="alert">
                                <div className="flex items-center">
                                    <AlertTriangle className="mr-3 h-5 w-5" />
                                    <span className="block text-sm sm:inline">{error}</span>
                                </div>
                                <button type="button" onClick={() => setError(null)} aria-label="Cerrar alerta">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        )}

                        {successMessage && (
                             <div className="relative flex items-center rounded-lg border border-green-400/50 bg-green-100/80 px-4 py-3 text-green-700 dark:bg-green-900/50 dark:text-green-300" role="alert">
                                <CheckCircle className="mr-3 h-5 w-5" />
                                <span className="block text-sm sm:inline">{successMessage}</span>
                            </div>
                        )}

                        <button type="submit" disabled={loading || !!successMessage} className="flex w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 py-3 font-semibold text-white hover:from-green-700 hover:to-green-800 disabled:cursor-not-allowed disabled:opacity-60">
                            <Send className="h-5 w-5" />
                            <span>{loading ? 'Enviando...' : 'Enviar Enlace'}</span>
                        </button>
                    </form>
                    <div className="mt-4 text-center">
                        <Link href="/login" className="text-sm text-gray-600 transition-colors hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400">
                            Volver a Inicio de Sesión
                        </Link>
                    </div>
                </div>
                 <footer className="mt-8 text-center text-xs text-gray-500 dark:text-gray-400">
                    <p>© {new Date().getFullYear()} SENA - Todos los derechos reservados</p>
                    <p>Desarrollado por Kevin Mariano</p>
                </footer>
            </main>
        </div>
    );
};