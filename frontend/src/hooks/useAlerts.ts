/**
 * @file useAlerts.ts
 * @route frontend/src/hooks
 * @description Hook para gestionar el estado de las alertas, su recolección por HTTP y la conexión WebSocket.
 * @author kevin mariano
 * @version 1.0.2 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert, AlertSeverity } from '@/types'; // Se importa AlertSeverity
import alertsService from '@/services/alertService';
import { socketManager } from '@/services/socketService'; 
import Swal from 'sweetalert2'; 
import { useAuth } from '@/context/AuthContext'; 

export const useAlerts = () => {
  const { user } = useAuth(); 
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = !!user;

  const fetchAlerts = useCallback(async () => {
    if (!isAuthenticated) return;
    
    // Solo mostramos el spinner en el primer fetch real
    if (alerts.length === 0) setLoading(true); 
    
    setError(null);
    try {
      const fetchedAlerts = await alertsService.getUnresolvedAlerts();
      fetchedAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAlerts(fetchedAlerts);
    } catch (err) {
      setError('No se pudieron cargar las alertas. Verifique la conexión con el servidor.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, alerts.length]); 

  // Manejador para alertas recibidas por WebSocket
  const handleNewAlert = useCallback((newAlert: Alert) => {
    console.log('🚨 Nueva alerta recibida por WebSocket:', newAlert);
    
    setAlerts(prevAlerts => {
        if (!newAlert.resolved && !prevAlerts.some(a => a.id === newAlert.id)) {
            
            // Lógica para determinar el ícono de SweetAlert
            const isCritical = newAlert.severity === AlertSeverity.CRITICAL || newAlert.severity === AlertSeverity.ERROR;

            Swal.fire({
                title: `🚨 ${newAlert.severity.toUpperCase()}`,
                text: newAlert.message,
                // FIX: Usamos CRITICAL/ERROR para el ícono 'error', y WARNING para 'warning'
                icon: isCritical ? 'error' : 'warning',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 8000,
                timerProgressBar: true,
                customClass: {
                    container: 'z-[9999]' 
                }
            });
            
            return [newAlert, ...prevAlerts];
        }
        return prevAlerts;
    });

  }, []); // handleNewAlert es estable

  const markAsResolved = useCallback(async (alertId: string) => {
    try {
      await alertsService.resolveAlert(alertId);
      setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
      Swal.fire('Resuelta', 'Alerta marcada como resuelta.', 'success');
    } catch (err) {
      Swal.fire('Error', 'No se pudo resolver la alerta. Intente de nuevo.', 'error');
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
        setAlerts([]);
        socketManager.close(); 
        return;
    }
    
    fetchAlerts(); 

    const token = localStorage.getItem('accessToken') || ''; 

    if (token) {
        socketManager.connect(token); 
        socketManager.on('new-alert', handleNewAlert); 
    }

    return () => {
      socketManager.off('new-alert', handleNewAlert); 
    };
    
  }, [isAuthenticated, fetchAlerts, handleNewAlert]);

  return {
    alerts,
    unresolvedCount: alerts.length,
    loading,
    error,
    markAsResolved,
    refreshAlerts: fetchAlerts,
  };
};