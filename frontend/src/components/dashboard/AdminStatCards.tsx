/**
 * @file AdminStatCards.tsx
 * @description Componente que muestra tarjetas de estadísticas rápidas, visible solo para administradores.
 * @technical_requirements Utiliza `useMemo` para calcular las estadísticas de forma eficiente, evitando
 * recálculos en cada renderizado a menos que los sensores cambien.
 */
 import React, { useMemo } from 'react';
 import { Card } from '@/components/common/Card';
 import { Cpu, Zap } from 'lucide-react';
 import { Sensor } from '@/types';
 
 /**
  * @interface AdminStatCardsProps
  * @description Propiedades para el componente de tarjetas de estadísticas de sensores.
  */
 interface AdminStatCardsProps {
   sensors: Sensor[]; 
 }
 
 /**
  * @component AdminStatCards
  * @description Muestra tarjetas con el conteo de sensores totales y activos para el estanque seleccionado.
  * @param {AdminStatCardsProps} props - Las propiedades del componente.
  * @returns {React.ReactElement | null} El componente renderizado, o `null` si no hay sensores.
  */
 export const AdminStatCards: React.FC<AdminStatCardsProps> = ({ sensors }) => {
   const stats = useMemo(() => ({
     totalSensors: sensors.length,
     activeSensors: sensors.filter(s => s.status === 'ACTIVE').length,
   }), [sensors]);
 
   if (sensors.length === 0) {
     return null;
   }
 
   return (
     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
       <Card className="p-4">
         <div className="flex items-center">
           <div className="p-3 rounded-md bg-gray-100 dark:bg-gray-700 mr-4">
             <Cpu className="w-6 h-6 text-gray-500 dark:text-gray-300" />
           </div>
           <div>
             <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sensores en este Estanque</p>
             <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSensors}</p>
           </div>
         </div>
       </Card>
       <Card className="p-4">
         <div className="flex items-center">
            <div className="p-3 rounded-md bg-green-100 dark:bg-green-500/20 mr-4">
             <Zap className="w-6 h-6 text-green-500" />
           </div>
           <div>
             <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sensores Activos</p>
             <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeSensors}</p>
           </div>
         </div>
       </Card>
     </div>
   );
 };