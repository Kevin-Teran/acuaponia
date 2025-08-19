/**
 * @file Card.tsx
 * @description Componente de tarjeta reutilizable y estilizado para encapsular secciones de contenido.
 * @technical_requirements Utiliza `clsx` (o una utilidad `cn`) para combinar clases de Tailwind CSS de forma dinámica.
 * Puede mostrar un título y un subtítulo opcionales.
 */
 import React from 'react';
 import { clsx } from 'clsx';
 
 interface CardProps {
   children: React.ReactNode;
   className?: string;
   title?: string;
   subtitle?: string;
 }
 
 export const Card: React.FC<CardProps> = ({
   children,
   className,
   title,
   subtitle
 }) => {
   return (
     <div className={clsx(
       'bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-colors',
       className
     )}>
       {(title || subtitle) && (
         <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
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
       )}
       <div className={clsx('p-6', { 'pt-4': title || subtitle })}>
         {children}
       </div>
     </div>
   );
 };