/**
 * @file useInfrastructure.ts
 * @description Hook personalizado para gestionar el estado y las operaciones CRUD de tanques y sensores.
 * @author Kevin Mariano
 * @version 1.1.0
 * @since 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import * as tankService from '@/services/tankService';
import { Tank } from '@/types'; 

/**
 * @typedef {object} UseInfrastructureReturn
 * @property {Tank[]} tanks - Lista de tanques.
 * @property {any[]} sensors - Lista de sensores (tipo a definir).
 * @property {boolean} loading - Indicador de estado de carga.
 * @property {Error | null} error - Objeto de error si una operación falla.
 * @property {() => Promise<void>} refreshTanks - Función para recargar la lista de tanques.
 * @property {(tankData: Omit<Tank, 'id'>) => Promise<void>} addTank - Función para crear un tanque.
 * @property {(id: string, tankData: Partial<Omit<Tank, 'id'>>) => Promise<void>} updateTank - Función para editar un tanque.
 * @property {(id: string) => Promise<void>} deleteTank - Función para eliminar un tanque.
 */

/**
 * @function useInfrastructure
 * @description Hook que abstrae la lógica de gestión de infraestructura (tanques, sensores).
 * @returns {UseInfrastructureReturn} El estado y las funciones para manipular los datos.
 */
export const useInfrastructure = () => {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * @function fetchTanks
   * @description Obtiene los tanques del backend y actualiza el estado.
   * @private
   */
  const fetchTanks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await tankService.getTanks();
      setTanks(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTanks();
  }, [fetchTanks]);

  /**
   * @function addTank
   * @description Crea un nuevo tanque y recarga la lista.
   * @param {Omit<Tank, 'id'>} tankData - Datos del nuevo tanque.
   */
  const addTank = async (tankData: Omit<Tank, 'id'>) => {
    try {
      await tankService.createTank(tankData);
      await fetchTanks();
    } catch (err) {
      setError(err as Error);
      throw err; 
    }
  };

  /**
   * @function updateTank
   * @description Actualiza un tanque y recarga la lista.
   * @param {string} id - ID del tanque.
   * @param {Partial<Omit<Tank, 'id'>>} tankData - Datos a actualizar.
   */
  const updateTank = async (id: string, tankData: Partial<Omit<Tank, 'id'>>) => {
    try {
      await tankService.updateTank(id, tankData);
      await fetchTanks();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  /**
   * @function deleteTank
   * @description Elimina (lógicamente) un tanque y recarga la lista.
   * @param {string} id - ID del tanque.
   */
  const deleteTank = async (id: string) => {
    try {
      await tankService.deleteTank(id);
      await fetchTanks();
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    tanks,
    loading,
    error,
    refreshTanks: fetchTanks,
    addTank,
    updateTank,
    deleteTank,
  };
};