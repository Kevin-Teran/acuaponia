import React from 'react';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * @component Modal
 * @desc Un componente de modal genérico y reutilizable para la aplicación.
 */
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
      aria-modal="true"
      role="dialog"
    >
      <div className={cn(
        "bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full flex flex-col animate-in fade-in zoom-in-95",
        sizeClasses[size]
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-1 text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5"/>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};