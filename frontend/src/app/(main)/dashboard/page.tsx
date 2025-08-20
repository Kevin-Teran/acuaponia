/**
 * @file page.tsx (Dashboard)
 * @description Página principal del dashboard con carga de datos granular y
 * manejo del estado de los filtros.
 * @author Kevin Mariano
 * @version 5.0.0
 */
 'use client';

 import React, { useState, useEffect } from 'react';
 import { useAuth } from '@/context/AuthContext';
 import { SummaryCards } from '@/components/dashboard/SummaryCards';
 import { LineChart } from '@/components/dashboard/LineChart';
 import { GaugeChart } from '@/components/dashboard/GaugeChart';
 import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
 import { AdminStatCards } from '@/components/dashboard/AdminStatCards';
 import { DataCard } from '@/components/common/DataCard';
 import { Tank, SensorData } from '@/types';
 
 // Simula una llamada a la API con un retardo
 const fetchApiData = (delay = 1500, data: any = []) => {
   return new Promise(resolve => setTimeout(() => resolve(data), delay));
 };
 
 /**
  * @page DashboardPage
  * @description Ahora gestiona el estado de los filtros y lo pasa a los
  * componentes hijos, asegurando que `DashboardFilters` reciba los datos que necesita.
  */
 const DashboardPage: React.FC = () => {
   const { user } = useAuth();
 
   // --- ESTADOS DE CARGA ---
   const [loadingSummary, setLoadingSummary] = useState(true);
   const [loadingAdminStats, setLoadingAdminStats] = useState(true);
   const [loadingLineChart, setLoadingLineChart] = useState(true);
   const [loadingGaugeChart, setLoadingGaugeChart] = useState(true);
   const [loadingTanks, setLoadingTanks] = useState(true); // Nuevo estado de carga para los filtros
 
   // --- ESTADOS DE DATOS Y FILTROS ---
   const [sensorData, setSensorData] = useState<SensorData[]>([]);
   const [tanks, setTanks] = useState<Tank[]>([]); // Estado para la lista de tanques
   const [selectedTank, setSelectedTank] = useState<string>('all'); // Estado para el tanque seleccionado
 
   // Cargar lista de tanques para los filtros
   useEffect(() => {
     const loadTanks = async () => {
       try {
         // Simulación: Reemplaza esto con tu llamada real, ej: tankService.getAll()
         const fetchedTanks: Tank[] = await fetchApiData(800, [
           { id: 'tank-1', name: 'Estanque A-01' },
           { id: 'tank-2', name: 'Estanque B-02 (Tilapias)' },
         ]) as Tank[];
         setTanks(fetchedTanks);
       } catch (error) {
         console.error("Error al cargar los estanques:", error);
       } finally {
         setLoadingTanks(false);
       }
     };
     loadTanks();
   }, []);
   
   // Aquí mantienes el resto de tus useEffects para cargar los otros datos...
   // (Opcional: puedes hacer que se vuelvan a ejecutar cuando `selectedTank` cambie)
 
   return (
     <div className="animate-in fade-in duration-500 space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
         <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
         {/* ===== PASANDO LAS PROPS REQUERIDAS ===== */}
         <DashboardFilters 
           tanks={tanks} 
           selectedTank={selectedTank} 
           onTankChange={setSelectedTank} 
         />
       </div>
       
       {user?.role === 'ADMIN' && (
          <DataCard title="Estadísticas del Sistema" isLoading={loadingAdminStats} skeletonClassName="h-24">
             <AdminStatCards />
          </DataCard>
       )}
       
       <DataCard title="Resumen de Sensores" isLoading={loadingSummary} skeletonClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 h-28">
         <SummaryCards data={sensorData} />
       </DataCard>
       
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2">
           <DataCard title="Historial de Parámetros" isLoading={loadingLineChart}>
             <LineChart data={sensorData} />
           </DataCard>
         </div>
         <div>
           <DataCard title="Nivel de Agua Actual" isLoading={loadingGaugeChart}>
             <GaugeChart data={sensorData} />
           </DataCard>
         </div>
       </div>
     </div>
   );
 };
 
 export default DashboardPage; 