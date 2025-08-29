/**
 * @file DashboardFilters.tsx
 * @description Componente de filtros que se aplica automáticamente al cambiar una selección.
 * @author Kevin Mariano
 * @version 2.0.0
 */
 'use client';

 import { User, Tank } from '@/types';
 import React, { useState, useEffect } from 'react';
 
 interface Props {
   users: User[];
   tanks: Tank[];
   onFiltersChange: (filters: {
     userId: number;
     tankId: string;
     startDate: string;
     endDate: string;
   }) => void;
   isLoading: boolean;
   currentUser: User | null;
 }
 
 const getFormattedDate = (date: Date) => date.toISOString().split('T')[0];
 
 export default function DashboardFilters({ users, tanks, onFiltersChange, isLoading, currentUser }: Props) {
   const [selectedUserId, setSelectedUserId] = useState<string>(currentUser?.id?.toString() ?? '');
   const [selectedTankId, setSelectedTankId] = useState<string>(tanks[0]?.id ?? '');
   const [startDate, setStartDate] = useState<string>(() => {
     const oneWeekAgo = new Date();
     oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
     return getFormattedDate(oneWeekAgo);
   });
   const [endDate, setEndDate] = useState<string>(getFormattedDate(new Date()));
 
   useEffect(() => {
     // Si hay un tanque válido, aplica los filtros automáticamente.
     if (selectedTankId) {
       onFiltersChange({
         userId: Number(selectedUserId),
         tankId: selectedTankId,
         startDate,
         endDate,
       });
     }
   }, [selectedUserId, selectedTankId, startDate, endDate, onFiltersChange]);
 
   return (
     <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
       {currentUser?.role === 'ADMIN' && (
         <div className="flex flex-col">
           <label htmlFor="user-filter" className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Usuario</label>
           <select
             id="user-filter"
             value={selectedUserId}
             onChange={(e) => setSelectedUserId(e.target.value)}
             disabled={isLoading}
             className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
           >
             {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
           </select>
         </div>
       )}
       <div className="flex flex-col">
         <label htmlFor="tank-filter" className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Tanque</label>
         <select
           id="tank-filter"
           value={selectedTankId}
           onChange={(e) => setSelectedTankId(e.target.value)}
           disabled={isLoading || tanks.length === 0}
           className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
         >
           {tanks.length > 0 ? (
             tanks.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))
           ) : (
             <option>No hay tanques disponibles</option>
           )}
         </select>
       </div>
       <div className="flex flex-col">
         <label htmlFor="start-date" className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Fecha de Inicio</label>
         <input
           type="date"
           value={startDate}
           onChange={(e) => setStartDate(e.target.value)}
           disabled={isLoading}
           className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
         />
       </div>
       <div className="flex flex-col">
         <label htmlFor="end-date" className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Fecha de Fin</label>
         <input
           type="date"
           value={endDate}
           onChange={(e) => setEndDate(e.target.value)}
           disabled={isLoading}
           max={getFormattedDate(new Date())}
           className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
         />
       </div>
     </div>
   );
 }