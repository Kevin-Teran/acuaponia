/**
 * @file AdminStatCards.tsx
 * @description Muestra tarjetas con estadísticas clave para la vista de administrador.
 * @author Kevin Mariano
 * @version 2.0.0
 */
 'use client';

 import React, { useState, useEffect, useMemo } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card';
 import { Skeleton } from '@/components/common/Skeleton';
 import { Wifi, Users, Server, AlertTriangle } from 'lucide-react';
 import { Sensor, User } from '@/types';
 import { getAllSensors } from '@/services/sensorService'; // Asumiendo que tienes este servicio
 import { getAllUsers } from '@/services/userService';     // Reutilizamos el servicio de usuarios
 
 /**
  * @component AdminStatCards
  * @description Un componente autocontenido que busca y muestra estadísticas
  * generales del sistema como total de usuarios, sensores, etc.
  */
 export const AdminStatCards: React.FC = () => {
   const [sensors, setSensors] = useState<Sensor[]>([]);
   const [users, setUsers] = useState<User[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
 
   /**
    * @effect
    * @description Carga todos los datos necesarios para las tarjetas de estadísticas
    * cuando el componente se monta.
    */
   useEffect(() => {
     const fetchAdminData = async () => {
       setIsLoading(true);
       setError(null);
       try {
         // Hacemos las llamadas a la API en paralelo para mayor eficiencia
         const [sensorsData, usersData] = await Promise.all([
           getAllSensors(), 
           getAllUsers()
         ]);
         setSensors(sensorsData);
         setUsers(usersData);
       } catch (err) {
         console.error("Error al cargar datos de administrador:", err);
         setError("No se pudieron cargar las estadísticas.");
       } finally {
         setIsLoading(false);
       }
     };
 
     fetchAdminData();
   }, []);
 
   /**
    * @memo
    * @description Calcula las estadísticas. `useMemo` previene recálculos innecesarios
    * si los datos de sensores o usuarios no han cambiado.
    */
   const stats = useMemo(() => ({
     totalUsers: users.length,
     totalSensors: sensors.length,
     activeSensors: sensors.filter(s => s.status === 'ACTIVE').length,
     alerts: sensors.filter(s => s.status === 'ALERT').length, // Asumiendo que hay un estado de alerta
   }), [sensors, users]);
 
   // --- Renderizado de Esqueletos mientras carga ---
   if (isLoading) {
     return (
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         {Array.from({ length: 4 }).map((_, index) => (
           <Card key={index}>
             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <Skeleton className="h-5 w-24" />
               <Skeleton className="h-6 w-6" />
             </CardHeader>
             <CardContent>
               <Skeleton className="h-8 w-16" />
             </CardContent>
           </Card>
         ))}
       </div>
     );
   }
   
   // --- Renderizado de Mensaje de Error ---
   if (error) {
     return <div className="text-red-500 text-center col-span-full">{error}</div>;
   }
 
   // --- Renderizado de Tarjetas con Datos ---
   return (
     <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
       {/* Tarjeta de Usuarios Totales */}
       <Card>
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
           <Users className="h-4 w-4 text-muted-foreground" />
         </CardHeader>
         <CardContent>
           <div className="text-2xl font-bold">{stats.totalUsers}</div>
         </CardContent>
       </Card>
       {/* Tarjeta de Sensores Totales */}
       <Card>
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Sensores Totales</CardTitle>
           <Server className="h-4 w-4 text-muted-foreground" />
         </CardHeader>
         <CardContent>
           <div className="text-2xl font-bold">{stats.totalSensors}</div>
         </CardContent>
       </Card>
       {/* Tarjeta de Sensores Activos */}
       <Card>
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Sensores Activos</CardTitle>
           <Wifi className="h-4 w-4 text-muted-foreground" />
         </CardHeader>
         <CardContent>
           <div className="text-2xl font-bold">{stats.activeSensors}</div>
         </CardContent>
       </Card>
       {/* Tarjeta de Alertas */}
       <Card>
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
           <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
           <AlertTriangle className="h-4 w-4 text-muted-foreground" />
         </CardHeader>
         <CardContent>
           <div className="text-2xl font-bold">{stats.alerts}</div>
         </CardContent>
       </Card>
     </div>
   );
 };