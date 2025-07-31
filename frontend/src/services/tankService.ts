import api from '../config/api';
import { Tank } from '../types';

/**
 * @fileoverview Servicio para gestionar las operaciones CRUD de los tanques.
 */

/**
 * @desc     Obtiene los tanques desde la API.
 * - Si el usuario es ADMIN, obtiene todos los tanques.
 * - Si el usuario es USER, obtiene solo sus tanques asignados.
 * @returns  {Promise<Tank[]>} Una promesa que resuelve a un array de tanques.
 */
export const getTanks = async (): Promise<Tank[]> => {
    const response = await api.get('/tanks');
    return response.data.data;
};

/**
 * @desc     Crea un nuevo tanque.
 * @param    {Omit<Tank, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'userId'>} tankData Datos del tanque a crear.
 * @returns  {Promise<Tank>} El tanque recién creado.
 */
export const createTank = async (tankData: Omit<Tank, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'userId'>): Promise<Tank> => {
    const response = await api.post('/tanks', tankData);
    return response.data.data;
};

/**
 * @desc     Actualiza un tanque existente.
 * @param    {string} id - ID del tanque a actualizar.
 * @param    {Partial<Tank>} tankData - Datos para actualizar.
 * @returns  {Promise<Tank>} El tanque actualizado.
 */
export const updateTank = async (id: string, tankData: Partial<Tank>): Promise<Tank> => {
    const response = await api.put(`/tanks/${id}`, tankData);
    return response.data.data;
};

/**
 * @desc     Elimina un tanque por su ID.
 * @param    {string} id - ID del tanque a eliminar.
 * @returns  {Promise<void>}
 */
export const deleteTank = async (id: string): Promise<void> => {
    await api.delete(`/tanks/${id}`);
};

/**
 * @desc     Obtiene los tanques de un usuario específico (solo para ADMIN).
 * @param    {string} userId - ID del usuario.
 * @returns  {Promise<Tank[]>} Un array de los tanques del usuario.
 */
export const getTanksByUser = async (userId: string): Promise<Tank[]> => {
    const response = await api.get(`/tanks/user/${userId}`);
    return response.data.data;
};