/**
 * @file tankService.ts
 * @description Servicio para gestionar las operaciones CRUD de los tanques.
 * @author kevin mariano
 * @version 2.0.0 
 * @since 1.0.0
 */

import api from '@/config/api';
import { Tank, CreateTankDto, UpdateTankDto } from '@/types';

/**
 * Obtiene una lista de tanques para un usuario específico.
 * @param {string} userId - ID del usuario para filtrar tanques.
 * @returns {Promise<Tank[]>} Una promesa que se resuelve con un array de tanques.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const getTanks = async (userId?: string): Promise<Tank[]> => {
  try {
    console.log(`🏗️ Fetching tanks for user: ${userId}`);
    const params = userId ? { userId } : {};
    const response = await api.get('/tanks', { params });
    console.log(`✅ Tanks response:`, response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching tanks:', error);
    throw error;
  }
};

/**
 * Obtiene un tanque específico por su ID.
 * @param {string} id - El ID del tanque a obtener.
 * @returns {Promise<Tank>} Una promesa que se resuelve con los datos del tanque.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const getTankById = async (id: string): Promise<Tank> => {
  try {
    const response = await api.get(`/tanks/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching tank by ID:', error);
    throw error;
  }
};

/**
 * Crea un nuevo tanque.
 * @param {CreateTankDto} tankData - Los datos del nuevo tanque.
 * @returns {Promise<Tank>} Una promesa que se resuelve con los datos del tanque creado.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const createTank = async (tankData: CreateTankDto): Promise<Tank> => {
  try {
    console.log('🆕 Creating tank:', tankData);
    const response = await api.post('/tanks', tankData);
    console.log('✅ Tank created:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error creating tank:', error);
    throw error;
  }
};

/**
 * Actualiza un tanque existente.
 * @param {string} id - El ID del tanque a actualizar.
 * @param {UpdateTankDto} tankData - Los nuevos datos para el tanque.
 * @returns {Promise<Tank>} Una promesa que se resuelve con los datos del tanque actualizado.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const updateTank = async (id: string, tankData: UpdateTankDto): Promise<Tank> => {
  try {
    console.log('🔄 Updating tank:', id, tankData);
    const response = await api.put(`/tanks/${id}`, tankData);
    console.log('✅ Tank updated:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error updating tank:', error);
    throw error;
  }
};

/**
 * Elimina un tanque.
 * @param {string} id - El ID del tanque a eliminar.
 * @returns {Promise<void>} Una promesa que se resuelve cuando el tanque ha sido eliminado.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const deleteTank = async (id: string): Promise<void> => {
  try {
    console.log('🗑️ Deleting tank:', id);
    await api.delete(`/tanks/${id}`);
    console.log('✅ Tank deleted successfully');
  } catch (error: any) {
    console.error('❌ Error deleting tank:', error);
    throw error;
  }
};