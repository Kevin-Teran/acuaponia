/**
 * @file Card.tsx
 * @description Componentes modulares y reutilizables para construir tarjetas de UI.
 * @version 2.0.0
 * @author Kevin Mariano
 * @technical_requirements Utiliza `clsx` para la combinación dinámica de clases y `React.forwardRef`
 * para una correcta propagación de refs.
 */
 import React from 'react';
 import { clsx } from 'clsx';
 
 // --- Contenedor Principal de la Tarjeta ---
 const Card = React.forwardRef<
   HTMLDivElement,
   React.HTMLAttributes<HTMLDivElement>
 >(({ className, ...props }, ref) => (
   <div
     ref={ref}
     className={clsx(
       'rounded-lg border border-gray-200 bg-white text-gray-900 shadow-md dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50',
       className
     )}
     {...props}
   />
 ));
 Card.displayName = 'Card';
 
 // --- Cabecera de la Tarjeta ---
 const CardHeader = React.forwardRef<
   HTMLDivElement,
   React.HTMLAttributes<HTMLDivElement>
 >(({ className, ...props }, ref) => (
   <div
     ref={ref}
     className={clsx('flex flex-col space-y-1.5 p-6', className)}
     {...props}
   />
 ));
 CardHeader.displayName = 'CardHeader';
 
 // --- Título de la Tarjeta ---
 const CardTitle = React.forwardRef<
   HTMLParagraphElement,
   React.HTMLAttributes<HTMLHeadingElement>
 >(({ className, ...props }, ref) => (
   <h3
     ref={ref}
     className={clsx(
       'text-lg font-semibold leading-none tracking-tight',
       className
     )}
     {...props}
   />
 ));
 CardTitle.displayName = 'CardTitle';
 
 // --- Descripción o Subtítulo de la Tarjeta ---
 const CardDescription = React.forwardRef<
   HTMLParagraphElement,
   React.HTMLAttributes<HTMLParagraphElement>
 >(({ className, ...props }, ref) => (
   <p
     ref={ref}
     className={clsx('text-sm text-gray-500 dark:text-gray-400', className)}
     {...props}
   />
 ));
 CardDescription.displayName = 'CardDescription';
 
 // --- Contenido Principal de la Tarjeta ---
 const CardContent = React.forwardRef<
   HTMLDivElement,
   React.HTMLAttributes<HTMLDivElement>
 >(({ className, ...props }, ref) => (
   <div ref={ref} className={clsx('p-6 pt-0', className)} {...props} />
 ));
 CardContent.displayName = 'CardContent';
 
 // --- Pie de la Tarjeta ---
 const CardFooter = React.forwardRef<
   HTMLDivElement,
   React.HTMLAttributes<HTMLDivElement>
 >(({ className, ...props }, ref) => (
   <div
     ref={ref}
     className={clsx('flex items-center p-6 pt-0', className)}
     {...props}
   />
 ));
 CardFooter.displayName = 'CardFooter';
 
 // --- Exportamos todos los componentes ---
 export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };