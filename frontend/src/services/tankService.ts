/**
 * @file tankService.ts
 * @description Servicio para gestionar todas las operaciones CRUD relacionadas con los tanques.
 */

import { api } from '@/config/api'; // <-- CORRECCIÓN APLICADA: Importación nombrada
import { Tank } from '@/types';

/**
 * Obtiene todos los tanques asociados a un ID de usuario específico.
 * Si no se provee un userId, el backend debería devolver los tanques del usuario autenticado.
 *
 * @param {string} [userId] - El ID del usuario para filtrar los tanques.
 * @returns {Promise<Tank[]>} Una promesa que resuelve a un arreglo de tanques.
 * @throws Lanza un error si la petición a la API falla.
 */
export const getTanks = async (userId?: string): Promise<Tank[]> => {
  try {
    const endpoint = userId ? `/tanks?userId=${userId}` : '/tanks';
    const response = await api.get(endpoint);
    return response.data;
  } catch (error) {
    console.error('Error al obtener los tanques:', error);
    throw error;
  }
};

/**
 * Crea un nuevo tanque en la base de datos.
 *
 * @param {Omit<Tank, 'id'>} tankData - Los datos del tanque a crear, sin el 'id'.
 * @returns {Promise<Tank>} Una promesa que resuelve con el objeto del tanque creado.
 * @throws Lanza un error si la petición a la API falla.
 */
export const createTank = async (tankData: Omit<Tank, 'id'>): Promise<Tank> => {
  try {
    const response = await api.post('/tanks', tankData);
    return response.data;
  } catch (error) {
    console.error('Error al crear el tanque:', error);
    throw error;
  }
};

/**
 * Actualiza la información de un tanque existente.
 *
 * @param {string} id - El ID del tanque a actualizar.
 * @param {Partial<Tank>} tankData - Los campos del tanque a actualizar.
 * @returns {Promise<Tank>} Una promesa que resuelve con el objeto del tanque actualizado.
 * @throws Lanza un error si la petición a la API falla.
 */
export const updateTank = async (id: string, tankData: Partial<Tank>): Promise<Tank> => {
  try {
    const response = await api.put(`/tanks/${id}`, tankData);
    return response.data;
  } catch (error) {
    console.error(`Error al actualizar el tanque ${id}:`, error);
    throw error;
  }
};

/**
 * Elimina un tanque de la base de datos.
 *
 * @param {string} id - El ID del tanque a eliminar.
 * @returns {Promise<void>} Una promesa que resuelve cuando la operación se completa.
 * @throws Lanza un error si la petición a la API falla.
 */
export const deleteTank = async (id: string): Promise<void> => {
  try {
    await api.delete(`/tanks/${id}`);
  } catch (error) {
    console.error(`Error al eliminar el tanque ${id}:`, error);
    throw error;
  }
};