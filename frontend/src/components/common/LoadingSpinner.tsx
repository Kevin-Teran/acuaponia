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

  // Estilos para la animación en una constante para mayor claridad
  const animationStyles = {
    background: `repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent 8px,
      rgba(251, 146, 60, 0.3) 8px,
      rgba(251, 146, 60, 0.6) 12px,
      rgba(251, 146, 60, 0.3) 12px,
      transparent 16px
    )`,
    animation: 'slideRight 2s linear infinite'
  };

  const spinnerContent = (
    <div className={`flex flex-col items-center justify-center p-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-300 ${className}`}>
      <div className="relative mb-6">
        <div className="relative overflow-hidden rounded-lg">
          <img 
            src="/logo-sena.png" 
            alt="Logo SENA" 
            className={`${sizeClasses[size].logo} w-auto filter drop-shadow-lg`}
            loading="lazy"
          />
          <div 
            className="absolute inset-0 opacity-70"
            style={animationStyles}
          />
        </div>
      </div>
      
      {message && (
        <p className={`text-gray-700 dark:text-gray-200 font-medium text-center max-w-sm ${sizeClasses[size].text} leading-relaxed`}>
          {message}
        </p>
      )}
      
      <div className="flex mt-4 space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-orange-400 dark:bg-orange-300 rounded-full animate-pulse"
            style={{ 
              animationDelay: `${i * 0.4}s`,
              animationDuration: '2s'
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes slideRight {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-colors duration-300"
      >
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