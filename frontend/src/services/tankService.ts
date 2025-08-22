/**
 * @file tankService.ts
 * @description Servicio para gestionar las operaciones CRUD de los tanques.
 * @author kevin mariano
 * @version 1.2.0
 * @since 1.0.0
 */

import api from '@/config/api';
import { Tank, CreateTankDto, UpdateTankDto } from '@/types';

/**
 * Obtiene una lista de todos los tanques.
 * @returns {Promise<Tank[]>} Una promesa que se resuelve con un array de tanques.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const getTanks = async (): Promise<Tank[]> => {
  const response = await api.get('/tanks');
  return response.data;
};

/**
 * Obtiene un tanque específico por su ID.
 * @param {string} id - El ID del tanque a obtener.
 * @returns {Promise<Tank>} Una promesa que se resuelve con los datos del tanque.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const getTankById = async (id: string): Promise<Tank> => {
    const response = await api.get(`/tanks/${id}`);
    return response.data;
};

/**
 * Crea un nuevo tanque.
 * @param {CreateTankDto} tankData - Los datos del nuevo tanque.
 * @returns {Promise<Tank>} Una promesa que se resuelve con los datos del tanque creado.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const createTank = async (tankData: CreateTankDto): Promise<Tank> => {
  const response = await api.post('/tanks', tankData);
  return response.data;
};

/**
 * Actualiza un tanque existente.
 * @param {string} id - El ID del tanque a actualizar.
 * @param {UpdateTankDto} tankData - Los nuevos datos para el tanque.
 * @returns {Promise<Tank>} Una promesa que se resuelve con los datos del tanque actualizado.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const updateTank = async (id: string, tankData: UpdateTankDto): Promise<Tank> => {
  const response = await api.put(`/tanks/${id}`, tankData);
  return response.data;
};

/**
 * Elimina un tanque.
 * @param {string} id - El ID del tanque a eliminar.
 * @returns {Promise<void>} Una promesa que se resuelve cuando el tanque ha sido eliminado.
 * @throws {Error} Si ocurre un error durante la llamada a la API.
 */
export const deleteTank = async (id: string): Promise<void> => {
  await api.delete(`/tanks/${id}`);
};