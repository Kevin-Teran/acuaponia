/**
 * @file ResetPasswordForm.tsx
 * @route frontend/src/components/auth
 * @description
 * Componente de UI para el formulario de restablecimiento de contraseña.
 * @author Kevin Mariano
 * @version 1.1.1
 * @since 1.0.0
 * @copyright SENA 2025
*/

'use client';

import React, { useState, FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, KeyRound, Sun, Moon, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { authService } from '@/services/authService';
import { useTheme } from '@/context/ThemeContext';

export const ResetPasswordForm: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { effectiveTheme, toggleTheme } = useTheme();
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // @ts-ignore
            const response = await authService.resetPassword(token, password);
            // @ts-ignore
            setSuccessMessage(response.message + ' Serás redirigido en 3 segundos...');
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'El token es inválido o ha expirado. Por favor, solicita un nuevo enlace.');
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
                    {effectiveTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
            </div>

            <main className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-500 sm:max-w-md sm:px-0">
                <header className="mb-6 text-center">
                    {/* 👇 INICIA LA CORRECCIÓN AQUÍ 👇 */}
                    <div className="relative mx-auto mb-3 h-16 w-16">
                        <Image
                            src="/logo-sena.png"
                            alt="Logo del SENA"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    {/* 👆 TERMINA LA CORRECCIÓN AQUÍ 👆 */}
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Establecer Nueva Contraseña</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Crea una contraseña segura y fácil de recordar</p>
                </header>

                <div className="rounded-2xl border border-gray-200 bg-white/80 p-8 shadow-xl backdrop-blur-sm dark:border-gray-700/50 dark:bg-gray-800/80">
                    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="password">
                                Nueva Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <input 
                                    id="password" 
                                    type={showPassword ? 'text' : 'password'} 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-12 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500" 
                                    placeholder="Mínimo 6 caracteres" 
                                    required 
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                         <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="confirmPassword">
                                Confirmar Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                                <input 
                                    id="confirmPassword" 
                                    type={showPassword ? 'text' : 'password'} 
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-12 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500" 
                                    placeholder="Repite la contraseña" 
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
                            <KeyRound className="h-5 w-5" />
                            <span>{loading ? 'Actualizando...' : 'Actualizar Contraseña'}</span>
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