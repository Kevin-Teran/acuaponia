/**
 * @file useInfrastructure.ts
 * @description Hook personalizado para gestionar los datos de la infraestructura (tanques, sensores, usuarios).
 * @technical_requirements Centraliza el fetching de datos, estados de carga y errores para
 * los componentes relacionados con la gestión de dispositivos.
 */
 import { useState, useEffect, useCallback } from 'react';
 import { Tank, Sensor, User } from '@/types';
 import * as tankService from '@/services/tankService';
 import * as sensorService from '@/services/sensorService';
 import * as userService from '@/services/userService';
 
 export const useInfrastructure = (isAdmin: boolean) => {
   const [data, setData] = useState<{ tanks: Tank[]; sensors: Sensor[]; users: User[] }>({ tanks: [], sensors: [], users: [] });
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
 
   const fetchDataForUser = useCallback(async (userId: string) => {
     setLoading(true);
     setError(null);
     try {
       const [tanks, sensors] = await Promise.all([
         tankService.getTanks(userId),
         sensorService.getSensors(userId)
       ]);
       setData(prev => ({ ...prev, tanks, sensors }));
     } catch (err: any) {
       setError('No se pudieron cargar los datos de infraestructura.');
       console.error(err);
     } finally {
       setLoading(false);
     }
   }, []);
   
   const fetchAdminData = useCallback(async () => {
     setLoading(true);
     setError(null);
     try {
         const users = await userService.getAllUsers();
         setData(prev => ({...prev, users}));
     } catch(err) {
         setError('No se pudieron cargar los usuarios.');
         console.error(err);
     }
   }, []);
 
   useEffect(() => {
     if (isAdmin) {
       fetchAdminData();
     }
   }, [isAdmin, fetchAdminData]);
 
   return { ...data, loading, error, fetchDataForUser };
 };