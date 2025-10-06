/**
 * @file LoadingSpinner.tsx
 * @route frontend/src/components/common
 * @description Componente de carga altamente reutilizable y personalizable con una animación visual del logo del SENA.
 * Optimizado para ofrecer una experiencia de usuario fluida con animaciones de entrada.
 * @author Kevin Mariano
 * @version 1.0.1
 * @since 1.0.0
 * @copyright SENA 2025
 */

'use client';

import React from 'react';
import { clsx } from 'clsx';
import getConfig from 'next/config'; 

/**
 * @interface LoadingSpinnerProps
 * @description Propiedades para el componente LoadingSpinner.
 */
interface LoadingSpinnerProps {
  /**
   * @prop {('sm' | 'md' | 'lg')} [size='md'] - Define el tamaño del spinner y del texto.
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * @prop {string} [message] - Mensaje opcional que se muestra debajo del spinner.
   */
  message?: string;
  /**
   * @prop {boolean} [fullScreen=false] - Si es true, el spinner ocupa toda la pantalla con un fondo semitransparente.
   */
  fullScreen?: boolean;
  /**
   * @prop {string} [className] - Clases CSS adicionales para el contenedor principal del contenido del spinner.
   */
  className?: string;
}

/**
 * @component LoadingSpinner
 * @description Un componente que muestra una animación de carga con el logo del SENA.
 * Asegura la ruta de la imagen estática usando un fallback de basePath.
 * @param {LoadingSpinnerProps} props - Las propiedades del componente.
 * @returns {React.ReactElement} El componente de carga.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  fullScreen = false,
  className = '',
}) => {
  const config = getConfig() || {};
  const basePath = config.publicRuntimeConfig?.basePath || ''; 
  
  const finalBasePath = basePath || '/acuaponia'; 
  const imageSrc = `${finalBasePath}/logo-sena.png`;

  const sizeClasses = {
    sm: { container: 'w-20 h-20', text: 'text-sm' },
    md: { container: 'w-24 h-24', text: 'text-base' },
    lg: { container: 'w-28 h-28', text: 'text-lg' },
  };

  const senaGreen = '#39A900';

  const spinnerContent = (
    <div
      className={clsx('flex flex-col items-center justify-center p-8', className)}
    >
      <div className={clsx('relative mb-6', sizeClasses[size].container)}>
        <img
          src={imageSrc}
          alt="Logo SENA de fondo"
          className="object-contain filter grayscale opacity-25 w-full h-full"
          loading="eager" 
        />
        <div className="absolute inset-0 animate-fill-up">
          <img
            src={imageSrc}
            alt="Logo SENA en carga"
            className="object-contain w-full h-full"
            loading="eager"
          />
        </div>
      </div>

      {message && (
        <p
          className={clsx(
            'text-gray-700 dark:text-gray-200 font-medium text-center max-w-xs',
            sizeClasses[size].text
          )}
        >
          {message}
        </p>
      )}

      {/* Puntos pulsantes para indicar actividad */}
      <div className="flex mt-4 space-x-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full animate-pulse-dot"
            style={{ backgroundColor: senaGreen, animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
          {spinnerContent}
        </div>
      </div>
    );
  }

  return <div className="animate-in fade-in duration-300">{spinnerContent}</div>;
};