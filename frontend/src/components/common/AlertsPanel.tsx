/**
 * @file AlertsPanel.tsx
 * @route frontend/src/components/common
 * @description Implementa el botón flotante de alertas y el panel deslizable.
 * @author Kevin Mariano
 * @version 1.0.6 (Fix de Tipado Final)
 * @since 1.0.0
 * @copyright SENA 2025
 */

import React from 'react';
import { useAlerts } from '@/hooks/useAlerts';
import { Alert, AlertSeverity } from '@/types'; 
import { cn } from '@/utils/cn';
import { X, Check, Bell } from 'lucide-react'; 

const BellIcon = Bell;
const XIcon = X;
const CheckIcon = Check;

interface AlertPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isOtherPanelOpen: boolean;
}

const getSeverityClasses = (severity: AlertSeverity) => {
  // Nota: AlertSeverity solo tiene INFO, WARNING, ERROR, CRITICAL según index.ts
  switch (severity) {
    case AlertSeverity.CRITICAL: 
    case AlertSeverity.ERROR: 
      return { 
        bg: 'bg-red-600/10 dark:bg-red-900/50', 
        border: 'border-red-600', 
        text: 'text-red-800 dark:text-red-300' 
      };
    case AlertSeverity.WARNING: 
      return { 
        bg: 'bg-yellow-100 dark:bg-yellow-900/50', 
        border: 'border-yellow-600', 
        text: 'text-yellow-800 dark:text-yellow-300' 
      };
    case AlertSeverity.INFO: 
    default:
      return { 
        bg: 'bg-blue-100 dark:bg-blue-900/50', 
        border: 'border-blue-600', 
        text: 'text-blue-800 dark:text-blue-300' 
      };
  }
};

const AlertItem: React.FC<{ alert: Alert; onResolve: (id: string) => void }> = ({ alert, onResolve }) => {
  const { bg, border, text } = getSeverityClasses(alert.severity);
  const alertTypeDisplay = alert.type.replace(/_/g, ' ');

  return (
    <div className={cn('p-3 border-l-4 rounded-md transition-all duration-200', bg, border, 'flex justify-between items-start')}>
      <div>
        <p className={cn('font-bold text-sm mb-1', text)}>{alertTypeDisplay} ({alert.severity.toUpperCase()})</p>
        <p className={cn('text-sm', text)}>{alert.message}</p> 
        <p className={cn('text-xs mt-1 opacity-75', text)}>{new Date(alert.createdAt).toLocaleString()}</p>
      </div>
      <button
        onClick={() => onResolve(alert.id)}
        className={cn('ml-4 p-1 rounded-full flex-shrink-0 transition-colors', 
                      'bg-white/50 hover:bg-white dark:bg-gray-700/50 dark:hover:bg-gray-700', 
                      text)}
        title="Marcar como resuelta"
        aria-label="Marcar como resuelta"
      >
        <CheckIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export const AlertsPanel: React.FC<AlertPanelProps> = ({ isOpen, onClose, isOtherPanelOpen }) => {
  const { alerts, unresolvedCount, loading, error, markAsResolved } = useAlerts();

  return (
    <>
      {/* 1. Botón Flotante para Alertas */}
      <button
        onClick={onClose}
        aria-label="Mostrar Alertas del Sistema"
        className={cn(
            "fixed top-6 right-6 z-50 p-4 rounded-full shadow-xl transition-all duration-300",
            "bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800",
            "flex items-center justify-center transform hover:scale-105",
            { 'hidden': isOtherPanelOpen && !isOpen } 
        )}
      >
        <BellIcon className="w-6 h-6" />
        {unresolvedCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1 py-0.5 text-xs font-bold leading-none text-gray-900 transform translate-x-1/2 -translate-y-1/2 bg-yellow-400 rounded-full ring-2 ring-white dark:ring-gray-900">
            {unresolvedCount > 99 ? '99+' : unresolvedCount}
          </span>
        )}
      </button>

      {/* 2. Panel de Alertas (Abre desde la derecha) */}
      
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          onClick={onClose} 
        ></div>
      )}

      <div
        className={cn(
          'fixed top-0 right-0 h-full w-80 sm:w-96 shadow-2xl z-50 transition-transform duration-300',
          'bg-white dark:bg-gray-800',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="p-6 h-full flex flex-col">
          <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Alertas ({unresolvedCount})</h2>
            <button 
              onClick={onClose} 
              aria-label="Cerrar Panel de Alertas"
              className="p-1 rounded-full text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {loading && <p className="text-center text-gray-500">Cargando alertas...</p>}
            {error && <p className="text-center text-red-500">{error}</p>}
            
            {!loading && alerts.length === 0 && !error && (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <p>🎉 ¡Tu sistema está en perfecto estado!</p>
                <p className="text-sm mt-1">No hay alertas sin resolver.</p>
              </div>
            )}
            
            {alerts.map(alert => (
              <AlertItem key={alert.id} alert={alert} onResolve={markAsResolved} />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};