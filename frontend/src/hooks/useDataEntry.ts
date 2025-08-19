/**
 * @file useDataEntry.ts
 * @description Hook personalizado que encapsula toda la lógica de estado y
 * las interacciones para el módulo de recolección y simulación de datos.
 */
 import { useState, useEffect, useCallback } from 'react';
 import { User, Tank, Sensor } from '@/types';
 import * as userService from '@/services/userService';
 import * as tankService from '@/services/tankService';
 import * as sensorService from '@/services/sensorService';
 import * as dataService from '@/services/dataService';
 import { mqttService } from '@/services/mqttService';
 import Swal from 'sweetalert2';
 import { useAuth } from '@/context/AuthContext';
 
 export const useDataEntry = () => {
     const { user: currentUser } = useAuth();
     const [users, setUsers] = useState<User[]>([]);
     const [tanks, setTanks] = useState<Tank[]>([]);
     const [sensors, setSensors] = useState<Sensor[]>([]);
     const [activeEmitters, setActiveEmitters] = useState<any[]>([]);
     const [selections, setSelections] = useState<{ user: string; tank: string; sensors: string[] }>({ user: '', tank: '', sensors: [] });
     
     const [loading, setLoading] = useState({ initial: true, users: true, tanks: false, submitting: false, emitterAction: false });
     const [stoppingEmitters, setStoppingEmitters] = useState<Set<string>>(new Set());
 
     const fetchAllData = useCallback(async () => {
         setLoading(prev => ({ ...prev, initial: true }));
         try {
             const [emittersData, usersData] = await Promise.all([
                 dataService.getEmitterStatus(),
                 userService.getAllUsers()
             ]);
             setActiveEmitters(emittersData || []);
             setUsers(usersData);
             if (currentUser && !selections.user) {
                 handleSelectUser(currentUser.id);
             }
         } catch (err) { console.error("Error fetching initial data:", err); } 
         finally { setLoading(prev => ({ ...prev, initial: false, users: false })); }
     }, [currentUser]);
 
     useEffect(() => {
         mqttService.connect().catch(console.error);
         fetchAllData();
     }, [fetchAllData]);
 
     const handleSelectUser = useCallback(async (userId: string) => {
         setSelections({ user: userId, tank: '', sensors: [] });
         if (!userId) { setTanks([]); setSensors([]); return; }
         setLoading(prev => ({ ...prev, tanks: true }));
         try {
             const [tanksData, sensorsData] = await Promise.all([tankService.getTanks(userId), sensorService.getSensors(userId)]);
             setTanks(tanksData);
             setSensors(sensorsData);
             if (tanksData.length > 0) {
                 setSelections(prev => ({ ...prev, tank: tanksData[0].id }));
             }
         } catch (err) { console.error(err); } 
         finally { setLoading(prev => ({ ...prev, tanks: false })); }
     }, []);
 
     const handleMqttSubmit = useCallback(async (entries: { sensorId: string, value: number }[]) => {
         setLoading(prev => ({ ...prev, submitting: true }));
         try {
             for (const entry of entries) {
                 const sensor = sensors.find(s => s.id === entry.sensorId);
                 if (sensor?.hardwareId) {
                     await mqttService.publish(`sena/acuaponia/sensors/${sensor.hardwareId}/data`, JSON.stringify({ value: entry.value }));
                 }
             }
             Swal.fire({ icon: 'success', title: 'Datos enviados por MQTT', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
         } catch (error) { Swal.fire('Error', 'La publicación en MQTT falló.', 'error'); } 
         finally { setLoading(prev => ({ ...prev, submitting: false })); }
     }, [sensors]);
 
     const handleStartEmitters = useCallback(async () => {
         setLoading(prev => ({ ...prev, emitterAction: true }));
         try {
             await dataService.startEmitters(selections.sensors);
             await fetchAllData();
             Swal.fire({ icon: 'success', title: 'Simulación iniciada', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
             setSelections(prev => ({...prev, sensors: []}));
         } catch (error: any) { Swal.fire('Error', error.response?.data?.message || 'No se pudo iniciar la simulación.', 'error'); } 
         finally { setLoading(prev => ({ ...prev, emitterAction: false })); }
     }, [selections.sensors, fetchAllData]);
 
     const handleStopEmitter = useCallback(async (sensorId: string) => {
         setStoppingEmitters(prev => new Set(prev).add(sensorId));
         try {
             await dataService.stopEmitter(sensorId);
             await fetchAllData();
         } catch (error) { Swal.fire('Error', `No se pudo detener la simulación.`, 'error'); } 
         finally { setStoppingEmitters(prev => { const next = new Set(prev); next.delete(sensorId); return next; }); }
     }, [fetchAllData]);
 
     return {
         users, tanks, sensors, activeEmitters, selections, loading, stoppingEmitters,
         handleSelectUser, setSelections, handleMqttSubmit, handleStartEmitters, handleStopEmitter
     };
 };