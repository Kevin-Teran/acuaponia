/**
 * @file useDashboard.ts
 * @description Hook centralizado para la lógica y datos del Dashboard.
 * @author Kevin Mariano
 * @version 3.1.0
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { User, Tank, UserFromApi, ProcessedDataPoint } from '@/types';
import { getUsers } from '@/services/userService';
import { getTanks } from '@/services/tankService';
import { getDashboardData } from '@/services/dashboardService';
// CORRECCIÓN 1: Importar getSettings desde settingsService
import { getSettings } from '@/services/settingsService';
// CORRECCIÓN 2: Importar socketService correctamente
import { socketService } from '@/services/socketService';

const getFormattedDate = (date: Date) => date.toISOString().split('T')[0];

export const useDashboard = () => {
  const { user: currentUser } = useAuth();
  
  const [filters, setFilters] = useState({ userId: '', tankId: '', startDate: '', endDate: '' });
  const [users, setUsers] = useState<UserFromApi[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  
  // Datos para los componentes
  const [latestData, setLatestData] = useState<any>(null);
  const [historicalData, setHistoricalData] = useState<ProcessedDataPoint[]>([]);
  const [summary, setSummary] = useState({
      temperature: { min: 0, max: 0, avg: 0 },
      ph: { min: 0, max: 0, avg: 0 },
      oxygen: { min: 0, max: 0, avg: 0 },
  });

  const [loading, setLoading] = useState({ base: true, data: false });

  // Carga inicial de usuarios y tanques
  useEffect(() => {
    const loadBaseData = async () => {
      if (!currentUser) return;
      setLoading(prev => ({ ...prev, base: true }));
      
      try {
        let userList: UserFromApi[] = currentUser.role === 'ADMIN' ? await getUsers() : [{ ...currentUser, _count: { tanks: 0 } } as UserFromApi];
        setUsers(userList);
        
        const initialUserId = String(currentUser.id);
        const userTanks = await getTanks(initialUserId);
        setTanks(userTanks);

        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        setFilters({
          userId: initialUserId,
          tankId: userTanks.length > 0 ? userTanks[0].id : '',
          startDate: getFormattedDate(oneWeekAgo),
          endDate: getFormattedDate(new Date()),
        });
      } catch (error) {
        console.error('Error en carga base:', error);
      } finally {
        setLoading(prev => ({ ...prev, base: false }));
      }
    };
    loadBaseData();
  }, [currentUser]);

  // CORRECCIÓN 3: Función para cargar datos de usuario con thresholds
  const loadDataForUser = useCallback(async (userId: string) => {
    try {
      // Cargar configuraciones del usuario (incluyendo thresholds)
      const userSettings = await getSettings(userId);
      
      // Cargar tanques del usuario
      const userTanks = await getTanks(userId);
      setTanks(userTanks);
      
      // Aquí puedes usar userSettings.thresholds si es necesario
      console.log('User settings loaded:', userSettings);
      
      return { settings: userSettings, tanks: userTanks };
    } catch (error) {
      console.error('Error al cargar datos para el usuario:', error);
      throw error;
    }
  }, []);

  // CORRECCIÓN 4: Conectar socket cuando se monta el componente
  useEffect(() => {
    if (currentUser) {
      socketService.connect();
      
      // Cleanup al desmontarse
      return () => {
        socketService.disconnect();
      };
    }
  }, [currentUser]);

  // Carga de datos del dashboard (automático)
  useEffect(() => {
    const fetchAllDashboardData = async () => {
      if (!filters.tankId) return;
      
      setLoading(prev => ({ ...prev, data: true }));
      try {
        // CORRECCIÓN: Usar el endpoint específico del dashboard
        const dashboardData = await getDashboardData({
          userId: filters.userId ? Number(filters.userId) : undefined,
          tankId: filters.tankId,
          startDate: filters.startDate,
          endDate: filters.endDate,
        });
        
        setLatestData(dashboardData.latestData);
        setHistoricalData(dashboardData.timeSeries);
        setSummary({
          temperature: {
            min: dashboardData.summary.min.temperature || 0,
            max: dashboardData.summary.max.temperature || 0,
            avg: dashboardData.summary.avg.temperature || 0,
          },
          ph: {
            min: dashboardData.summary.min.ph || 0,
            max: dashboardData.summary.max.ph || 0,
            avg: dashboardData.summary.avg.ph || 0,
          },
          oxygen: {
            min: dashboardData.summary.min.oxygen || 0,
            max: dashboardData.summary.max.oxygen || 0,
            avg: dashboardData.summary.avg.oxygen || 0,
          },
        });

      } catch (error) {
        console.error("Error al obtener datos del dashboard:", error);
      } finally {
        setLoading(prev => ({ ...prev, data: false }));
      }
    };
    fetchAllDashboardData();
  }, [filters]);

  // CORRECCIÓN 5: Manejar cambio de usuario y recargar sus datos
  const handleFilterChange = useCallback(async (field: string, value: string) => {
    if (field === 'userId' && value !== filters.userId) {
      // Si cambia el usuario, cargar sus datos específicos
      try {
        await loadDataForUser(value);
        setFilters(prev => ({ 
          ...prev, 
          [field]: value,
          tankId: '' // Reset tankId when user changes
        }));
      } catch (error) {
        console.error('Error al cambiar usuario:', error);
      }
    } else {
      setFilters(prev => ({ ...prev, [field]: value }));
    }
  }, [filters.userId, loadDataForUser]);

  return { 
    loading, 
    users, 
    tanks, 
    filters, 
    handleFilterChange, 
    latestData, 
    historicalData, 
    summary, 
    currentUser,
    loadDataForUser // Exportar por si se necesita externamente
  };
};