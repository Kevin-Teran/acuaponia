/**
 * @file useInfrastructure.ts
 * @description Hook personalizado para gestionar el estado y las operaciones CRUD de tanques y sensores.
 * @author Kevin Mariano
 * @version 2.0.0 
 * @since 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Tank, Sensor, User } from '@/types';
import * as tankService from '@/services/tankService';
import * as sensorService from '@/services/sensorService';
import * as userService from '@/services/userService';

interface UseInfrastructureReturn {
  tanks: Tank[];
  sensors: Sensor[];
  users: User[];
  loading: boolean;
  error: string | null;
  fetchDataForUser: (userId: string) => Promise<void>;
  refetchData: (userId: string) => Promise<void>;
}

/**
 * @function useInfrastructure
 * @description Hook que abstrae la lógica de gestión de infraestructura (tanques, sensores).
 * @param {boolean} isAdmin - Indica si el usuario actual es administrador
 * @returns {UseInfrastructureReturn} El estado y las funciones para manipular los datos.
 */
export const useInfrastructure = (isAdmin: boolean = false): UseInfrastructureReturn => {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * @function fetchDataForUser
   * @description Obtiene tanques y sensores para un usuario específico
   */
  const fetchDataForUser = useCallback(async (userId: string) => {
    if (!userId) {
      console.warn('useInfrastructure: userId es requerido');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log(`🔄 Fetching data for user: ${userId}`);
      
      // Obtener tanques del usuario
      const tanksData = await tankService.getTanks(userId);
      console.log(`📦 Tanques obtenidos:`, tanksData);
      setTanks(tanksData);

      // Obtener sensores del usuario
      const sensorsData = await sensorService.getSensors(userId);
      console.log(`🔧 Sensores obtenidos:`, sensorsData);
      setSensors(sensorsData);

    } catch (err: any) {
      console.error('❌ Error fetching infrastructure data:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Error al cargar los datos';
      setError(errorMessage);
      setTanks([]);
      setSensors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * @function refetchData
   * @description Alias para fetchDataForUser para mantener compatibilidad
   */
  const refetchData = useCallback((userId: string) => {
    return fetchDataForUser(userId);
  }, [fetchDataForUser]);

  /**
   * @function fetchUsers
   * @description Obtiene la lista de usuarios (solo para admins)
   */
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    
    try {
      console.log('👥 Fetching users list...');
      const usersData = await userService.getAllUsers();
      console.log(`👥 Usuarios obtenidos:`, usersData);
      setUsers(usersData);
    } catch (err: any) {
      console.error('❌ Error fetching users:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  return {
    tanks,
    sensors,
    users,
    loading,
    error,
    fetchDataForUser,
    refetchData,
  };
};