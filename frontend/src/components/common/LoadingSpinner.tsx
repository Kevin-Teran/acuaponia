import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  message,
  fullScreen = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: { logo: 'h-16', text: 'text-sm' },
    md: { logo: 'h-20', text: 'text-base' },
    lg: { logo: 'h-24', text: 'text-lg' }
  };

  const senaGreen = '#39A900';
  const imagePath = "/logo-sena.png"; 

  const spinnerContent = (
    <div className={`flex flex-col items-center justify-center p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-300 ${className}`}>
      
      {/* Contenedor principal del logo */}
      <div className={`relative mb-6 ${sizeClasses[size].logo} w-auto`}>
        {/* 1. Imagen de fondo (en escala de grises) */}
        <img 
          src={imagePath}
          alt="Logo SENA de fondo" 
          className="w-full h-full filter grayscale opacity-25"
        />

        {/* 2. Contenedor que revela la imagen de color con una animación */}
        <div className="absolute inset-0 w-full h-full animate-fill-up">
          <img 
            src={imagePath}
            alt="Logo SENA en carga" 
            className="w-full h-full"
          />
        </div>
      </div>
      
      {message && (
        <p className={`text-gray-700 dark:text-gray-200 font-medium text-center max-w-xs ${sizeClasses[size].text} leading-relaxed`}>
          {message}
        </p>
      )}
      
      <div className="flex mt-4 space-x-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ 
              backgroundColor: senaGreen,
              animationDelay: `${i * 0.3}s`,
              animationDuration: '1.5s'
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes fill-up {
          0% {
            clip-path: inset(100% 0 0 0);
          }
          50%, 100% {
            clip-path: inset(0% 0 0 0);
          }
        }
        .animate-fill-up {
          animation: fill-up 3s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
    </div>
  );

  // Lógica para pantalla completa
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-colors duration-300">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {spinnerContent}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      {spinnerContent}
    </div>
  );
};