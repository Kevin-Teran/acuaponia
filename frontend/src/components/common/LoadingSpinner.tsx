/**
 * @file LoadingSpinner.tsx
 * @description Componente reutilizable para mostrar un indicador de carga.
 * Puede mostrarse a pantalla completa o incrustado en otro componente.
 */
 import { clsx } from 'clsx'; // clsx es una utilidad para construir classNames condicionalmente

 /**
  * @interface LoadingSpinnerProps
  * @description Propiedades que acepta el componente LoadingSpinner.
  */
 interface LoadingSpinnerProps {
   fullScreen?: boolean; // Si es true, ocupa toda la pantalla con un fondo semitransparente.
   message?: string;     // Mensaje opcional que se muestra debajo del spinner.
   className?: string;   // Clases CSS adicionales para personalizar el contenedor.
 }
 
 /**
  * @component LoadingSpinner
  * @description Un componente visual que indica al usuario que una operación se está procesando.
  * @param {LoadingSpinnerProps} props - Las propiedades del componente.
  * @returns {React.ReactElement} El elemento del spinner de carga.
  */
 export const LoadingSpinner = ({ fullScreen = false, message, className }: LoadingSpinnerProps) => {
   const spinner = (
     <div className={clsx(
       'flex flex-col items-center justify-center space-y-3',
       className
     )}>
       <div
         className="h-10 w-10 animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent"
         role="status"
         aria-label="loading"
       ></div>
       {message && <p className="text-gray-600 dark:text-gray-400">{message}</p>}
     </div>
   );
 
   if (fullScreen) {
     return (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-black/70">
         {spinner}
       </div>
     );
   }
 
   return spinner;
 };