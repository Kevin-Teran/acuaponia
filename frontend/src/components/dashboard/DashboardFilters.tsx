/**
 * @file DashboardFilters.tsx
 * @description Componente para filtrar los datos del dashboard por fecha y estanque.
 * @author Kevin Mariano
 */
 'use client';

 import React from 'react';
 import { Filter, Calendar, BarChart2 } from 'lucide-react';
 import { Tank } from '@/types'; // Asegúrate que Tank esté definido en tus tipos
 
 // Se definen las props que el componente espera recibir.
 interface DashboardFiltersProps {
   tanks: Tank[];
   selectedTank: string;
   onTankChange: (tankId: string) => void;
   // Podrías añadir más props para fechas aquí, ej:
   // selectedDateRange: { from: Date; to: Date };
   // onDateRangeChange: (newRange) => void;
 }
 
 /**
  * @component DashboardFilters
  * @description Renderiza los controles de filtrado. Ahora es más robusto
  * al proveer valores por defecto para sus props, evitando errores si no se le pasan datos.
  */
 export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
   // ===== VALORES POR DEFECTO PARA ROBUSTEZ =====
   tanks = [],
   selectedTank = '',
   onTankChange = () => {},
   // ===========================================
 }) => {
   return (
     <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
       <div className="flex items-center text-gray-600 dark:text-gray-300">
         <Filter size={20} className="mr-2" />
         <span className="font-semibold">Filtros</span>
       </div>
       
       {/* Selector de Fecha (Ejemplo) */}
       <div className="relative flex items-center">
         <Calendar size={18} className="absolute left-3 text-gray-400" />
         <button className="w-full sm:w-auto pl-10 pr-4 py-2 text-left border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
           Últimos 7 días
         </button>
       </div>
       
       {/* Selector de Estanque */}
       <div className="relative flex items-center">
         <BarChart2 size={18} className="absolute left-3 text-gray-400" />
         <select
           value={selectedTank}
           onChange={e => onTankChange(e.target.value)}
           className="w-full sm:w-auto pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
           disabled={tanks.length === 0}
         >
           {tanks.length === 0 ? (
             <option value="">Cargando estanques...</option>
           ) : (
             <>
               <option value="all">Todos los Estanques</option>
               {tanks.map(tank => (
                 <option key={tank.id} value={tank.id}>{tank.name}</option>
               ))}
             </>
           )}
         </select>
       </div>
     </div>
   );
 };
 