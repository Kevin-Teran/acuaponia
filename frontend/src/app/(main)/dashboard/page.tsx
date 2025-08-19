/**
 * @page DashboardPage
 * @route /dashboard
 * @description Página principal de la aplicación después del inicio de sesión.
 * Muestra un resumen y los datos más importantes para el usuario.
 */
 'use client';

 import { useAuth } from "@/context/AuthContext";
 
 /**
  * @component Dashboard
  * @returns {React.ReactElement} El contenido de la página del dashboard.
  */
 export default function Dashboard() {
   const { user } = useAuth();
 
   return (
     <div>
       <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
         Dashboard de Monitoreo
       </h1>
       <p className="mt-2 text-gray-600 dark:text-gray-400">
         ¡Hola, <span className="font-semibold">{user?.name}</span>! Bienvenido a tu panel de control.
       </p>
       <div className="mt-6 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
         <p>Aquí se mostrarán los datos de los sensores en tiempo real...</p>
       </div>
     </div>
   );
 }