/**
 * @file useInfrastructure.ts
 * @description Hook personalizado para gestionar el estado y las operaciones CRUD de tanques y sensores.
 * Esta versión incluye una gestión de estado más refinada y una carga de datos optimizada.
 * @author Kevin Mariano
 * @version 3.0.0
 * @since 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Tank, Sensor, User } from '@/types';
import * as tankService from '@/services/tankService';
import * as sensorService from '@/services/sensorService';
import * as userService from '@/services/userService';

/**
 * @typedef {object} UseInfrastructureReturn
 * @description El objeto de retorno del hook `useInfrastructure`.
 * @property {Tank[]} tanks - La lista de tanques.
 * @property {Sensor[]} sensors - La lista de sensores.
 * @property {User[]} users - La lista de usuarios (solo para administradores).
 * @property {boolean} loading - Indica si los datos se están cargando.
 * @property {string | null} error - Mensaje de error, si lo hay.
 * @property {(userId: string) => Promise<void>} fetchDataForUser - Función para obtener los datos de un usuario específico.
 * @property {(userId: string) => Promise<void>} refetchData - Alias de `fetchDataForUser` para recargar los datos.
 */
export interface UseInfrastructureReturn {
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
 * @description Hook que abstrae la lógica de gestión de infraestructura (tanques, sensores y usuarios).
 * @param {boolean} isAdmin - Indica si el usuario actual es administrador.
 * @returns {UseInfrastructureReturn} El estado y las funciones para manipular los datos.
 * @example
 * const { tanks, sensors, users, loading, error, fetchDataForUser } = useInfrastructure(true);
 */
export const useInfrastructure = (isAdmin: boolean = false): UseInfrastructureReturn => {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * @function fetchUsers
   * @description Obtiene la lista de usuarios. Esta función solo se ejecuta si el usuario es administrador.
   * @private
   * @returns {Promise<void>}
   */
  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;

    try {
      console.log('👥 Fetching users list...');
      const usersData = await userService.getAllUsers();
      console.log(`✅ Usuarios obtenidos:`, usersData);
      setUsers(usersData);
    } catch (err: any) {
      console.error('❌ Error fetching users:', err);
      setError('No se pudo cargar la lista de usuarios.');
    }
  }, [isAdmin]);

  /**
   * @function fetchDataForUser
   * @description Obtiene los tanques y sensores para un ID de usuario específico.
   * @param {string} userId - El ID del usuario para el cual se obtendrán los datos.
   * @returns {Promise<void>}
   * @throws {Error} Si `userId` no se proporciona.
   */
  const fetchDataForUser = useCallback(async (userId: string) => {
    if (!userId) {
      console.warn('⚠️ useInfrastructure: userId es requerido para fetchDataForUser.');
      setTanks([]);
      setSensors([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log(`🔄 Fetching infrastructure data for user: ${userId}`);
      const [tanksData, sensorsData] = await Promise.all([
        tankService.getTanks(userId),
        sensorService.getSensors(userId)
      ]);
      console.log(`📦 Tanques obtenidos:`, tanksData);
      setTanks(tanksData);
      console.log(`🔧 Sensores obtenidos:`, sensorsData);
      setSensors(sensorsData);
    } catch (err: any) {
      console.error('❌ Error fetching infrastructure data:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Error al cargar los datos de infraestructura.';
      setError(errorMessage);
      setTanks([]);
      setSensors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * @function refetchData
   * @description Vuelve a cargar los datos para un usuario específico. Es un alias de `fetchDataForUser`.
   * @param {string} userId - El ID del usuario.
   * @returns {Promise<void>}
   */
  const refetchData = useCallback((userId: string) => {
    return fetchDataForUser(userId);
  }, [fetchDataForUser]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
    setLoading(false);
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