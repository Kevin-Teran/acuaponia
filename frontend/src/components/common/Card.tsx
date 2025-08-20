/**
 * @file Card.tsx
 * @description Componente de tarjeta reutilizable y estilizado para encapsular secciones de contenido.
 * @technical_requirements Utiliza `clsx` para combinar clases de Tailwind CSS de forma dinámica.
 */
 import React from 'react';
 import { clsx } from 'clsx';
 
 interface CardProps {
   children: React.ReactNode;
   className?: string;
   title?: string;
   subtitle?: string;
   headerExtra?: React.ReactNode; 
 }
 
 export const Card: React.FC<CardProps> = ({
   children,
   className,
   title,
   subtitle,
   headerExtra
 }) => {
   const hasHeader = title || subtitle || headerExtra;
 
   return (
     <div className={clsx(
       'bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-colors',
       className
     )}>
       {hasHeader && (
         <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
           <div>
             {title && (
               <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                 {title}
               </h3>
             )}
             {subtitle && (
               <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                 {subtitle}
               </p>
             )}
           </div>
           {headerExtra && <div>{headerExtra}</div>}
         </div>
       )}
       {/* Ajustamos el padding para que no haya padding superior si hay cabecera */}
       <div className="p-6">
         {children}
       </div>
     </div>
   );
 };