/**
 * @file DashboardFilters.tsx
 * @description Componente de UI para seleccionar los filtros de visualización del dashboard.
 * Permite filtrar por usuario (si es admin), por tanque y por rango de fechas.
 * @technical_requirements Es un "componente controlado", manejado por el estado del componente padre (Dashboard).
 */
 import React from 'react';
 import { User as UserIcon, Droplets, Calendar } from 'lucide-react';
 import { User, Tank } from '@/types';
 import { format } from 'date-fns';
 import { Card } from '@/components/common/Card';
 import { clsx } from 'clsx';
 
 /**
  * @interface DashboardFiltersProps
  * @description Define las propiedades que recibe el componente de filtros del dashboard.
  */
 interface DashboardFiltersProps {
   startDate: string;
   endDate: string;
   selectedTankId: string | null;
   selectedUserId?: string | null;
   onStartDateChange: (date: string) => void;
   onEndDateChange: (date: string) => void;
   onTankChange: (tankId: string) => void;
   onUserChange?: (userId: string) => void;
   tanks: Tank[];
   users?: User[];
   isAdmin: boolean;
 }
 
 /**
  * @component DashboardFilters
  * @param {DashboardFiltersProps} props - Las propiedades del componente.
  * @returns {React.ReactElement} El componente de filtros renderizado.
  */
 export const DashboardFilters: React.FC<DashboardFiltersProps> = ({
   startDate,
   endDate,
   selectedTankId,
   selectedUserId,
   onStartDateChange,
   onEndDateChange,
   onTankChange,
   onUserChange,
   tanks,
   users,
   isAdmin,
 }) => {
   const today = format(new Date(), 'yyyy-MM-dd');
 
   return (
     <Card>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
         
         {isAdmin && users && (
           <div className="lg:col-span-1">
             <label className="flex items-center mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
               <UserIcon className="w-4 h-4 mr-2" />
               Usuario
             </label>
             <select
               value={selectedUserId || ''}
               onChange={e => onUserChange && onUserChange(e.target.value)}
               className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
             >
               {users.map(user => (
                 <option key={user.id} value={user.id}>
                   {user.name}
                 </option>
               ))}
             </select>
           </div>
         )}
 
         <div className={clsx(isAdmin ? "lg:col-span-1" : "md:col-span-2 lg:col-span-2")}>
           <label className="flex items-center mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
             <Droplets className="w-4 h-4 mr-2" />
             Estanque
           </label>
           <select
             value={selectedTankId || ''}
             onChange={e => onTankChange(e.target.value)}
             className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
             disabled={tanks.length === 0}
           >
             {tanks.length === 0 ? (
                 <option value="">No hay estanques disponibles</option>
             ) : (
                 tanks.map(tank => (
                     <option key={tank.id} value={tank.id}>
                         {tank.name}
                     </option>
                 ))
             )}
           </select>
         </div>
 
         <div className="md:col-span-2 lg:col-span-2">
             <label className="flex items-center mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                 <Calendar className="w-4 h-4 mr-2" />
                 Rango de Fechas
             </label>
             <div className="flex items-center gap-2">
                 <input
                     type="date"
                     value={startDate}
                     onChange={(e) => onStartDateChange(e.target.value)}
                     className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                     max={endDate || today}
                 />
                 <span className="text-gray-500 dark:text-gray-400">-</span>
                 <input
                     type="date"
                     value={endDate}
                     onChange={(e) => onEndDateChange(e.target.value)}
                     className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                     min={startDate}
                     max={today}
                 />
             </div>
         </div>
       </div>
     </Card>
   );
 };