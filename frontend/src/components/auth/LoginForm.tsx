/**
 * @file LoginForm.tsx
 * @description Componente de UI robusto y completo para el formulario de inicio de sesión.
 * Incluye validaciones del lado del cliente, manejo de estado de carga, visibilidad de contraseña,
 * opción de "recordar sesión" y botones de acceso rápido para cuentas de demostración.
 * @technical_requirements Utiliza React Hooks (useState), SweetAlert2 para notificaciones,
 * Lucide-react para iconografía y el contexto de autenticación (useAuth) para la lógica de login.
 */
 'use client';

 import React, { useState, FormEvent, useCallback } from 'react';
 import Image from 'next/image';
 import { User, Lock, Eye, EyeOff, LogIn, UserCheck } from 'lucide-react';
 import Swal from 'sweetalert2';
 import { useAuth } from '@/context/AuthContext';
 import { LoadingSpinner } from '@/components/common/LoadingSpinner';
 import { LoginCredentials } from '@/types';
 
 /**
  * @component LoginForm
  * @description Un formulario de inicio de sesión completo con una interfaz de usuario moderna y validaciones integradas.
  * @returns {React.ReactElement} El componente del formulario de inicio de sesión.
  */
 export const LoginForm: React.FC = () => {
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [showPassword, setShowPassword] = useState(false);
   const [rememberMe, setRememberMe] = useState(false);
   const { login, loading } = useAuth();
 
   /**
    * @constant senaGreen
    * @description Color corporativo del SENA para consistencia en la UI de las alertas.
    */
   const senaGreen = '#39A900';
 
   /**
    * @function validateForm
    * @description Realiza validaciones en los campos del formulario antes del envío.
    * @returns {boolean} `true` si el formulario es válido, `false` en caso contrario.
    */
   const validateForm = useCallback((): boolean => {
     if (!email.trim() || !password.trim()) {
       Swal.fire({
         icon: 'warning',
         title: 'Campos Incompletos',
         text: 'Por favor, ingrese su correo y contraseña.',
         confirmButtonColor: senaGreen,
       });
       return false;
     }
     if (!/\S+@\S+\.\S+/.test(email)) {
       Swal.fire({
         icon: 'warning',
         title: 'Correo Inválido',
         text: 'Por favor, ingrese un formato de correo válido.',
         confirmButtonColor: senaGreen,
       });
       return false;
     }
     if (password.length < 6) {
       Swal.fire({
         icon: 'info',
         title: 'Contraseña Corta',
         text: 'La contraseña debe tener al menos 6 caracteres.',
         confirmButtonColor: senaGreen,
       });
       return false;
     }
     return true;
   }, [email, password]);
 
   /**
    * @function handleSubmit
    * @description Maneja el envío del formulario. Valida los datos y llama a la función de login del contexto.
    * @param {FormEvent<HTMLFormElement>} e - El evento del formulario.
    */
   const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
     e.preventDefault();
     if (!validateForm()) {
       return;
     }
 
     try {
       const credentials: LoginCredentials = { email, password, rememberMe };
       await login(credentials);
     } catch (error: any) {
       Swal.fire({
         icon: 'error',
         title: 'Acceso Denegado',
         text: error.message || 'Ha ocurrido un error inesperado. Inténtelo de nuevo.',
         confirmButtonColor: senaGreen,
       });
     }
   };
 
   /**
    * @function handleDemoLogin
    * @description Rellena el formulario con las credenciales de una cuenta de demostración.
    * @param {string} demoEmail - El email de la cuenta demo.
    * @param {string} demoPassword - La contraseña de la cuenta demo.
    */
   const handleDemoLogin = (demoEmail: string, demoPassword: string) => {
     setEmail(demoEmail);
     setPassword(demoPassword);
     setRememberMe(true);
   };
 
   /**
    * @constant demoAccounts
    * @description Define las cuentas de demostración para acceso rápido.
    * Las contraseñas coinciden con las definidas en `backend/prisma/seed.ts`.
    */
   const demoAccounts = [
     { email: 'admin@sena.edu.co', password: '123456', role: 'Administrador' },
     { email: 'usuario@sena.edu.co', password: '123456', role: 'Usuario' },
   ];
 
   if (loading) {
     return <LoadingSpinner fullScreen message="Validando credenciales..." />;
   }
 
   return (
     <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-black flex items-center justify-center p-4 transition-colors duration-300">
       <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-5 duration-500">
         <div className="text-center mb-8">
           <Image
             src="/logo-sena.png"
             alt="Logo SENA"
             width={80}
             height={80}
             className="mx-auto mb-4"
             style={{ height: 'auto' }}
             priority
           />
           <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Sistema de Monitoreo</h1>
           <p className="text-gray-600 dark:text-gray-400">Acuaponía - Servicio Nacional de Aprendizaje</p>
         </div>
         <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700/50">
           <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
                   placeholder="Mínimo 6 caracteres"
                   required
                 />
                 <button
                   type="button"
                   onClick={() => setShowPassword(!showPassword)}
                   className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                   aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                 >
                   {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                 </button>
               </div>
             </div>
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
             <button
               type="submit"
               disabled={loading}
               className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-green-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
             >
               <LogIn className="w-5 h-5" />
               <span>{loading ? 'Ingresando...' : 'Iniciar Sesión'}</span>
             </button>
           </form>
 
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
                   <div>
                     <p className="text-sm font-medium text-gray-900 dark:text-white">{account.email}</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400">{account.role}</p>
                   </div>
                 </button>
               ))}
             </div>
           </div>
         </div>
         <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-8">
           © {new Date().getFullYear()} SENA - Todos los derechos reservados
         </p>
       </div>
     </div>
   );
 };