/**
 * @file tankService.ts
 * @description Servicio para gestionar todas las operaciones CRUD relacionadas con los tanques (estanques).
 * @technical_requirements Utiliza una instancia de Axios (`api`) configurada para comunicarse con el backend.
 */
 import api from '@/config/api';
 import { Tank } from '@/types';
 
 /**
  * @function getTanks
  * @description Obtiene una lista de tanques. Un administrador puede opcionalmente filtrar por ID de usuario.
  * @param {string} [userId] - ID del usuario para filtrar los tanques (solo para administradores).
  * @returns {Promise<Tank[]>} Una promesa que resuelve a un array de tanques.
  */
 export const getTanks = async (userId?: string): Promise<Tank[]> => {
     const response = await api.get('/tanks', { params: userId ? { userId } : {} });
     return response.data;
 };
 
 /**
  * @function createTank
  * @description Envía los datos para crear un nuevo tanque.
  * @param {Partial<Tank>} tankData - Los datos del tanque a crear.
  * @returns {Promise<Tank>} El tanque recién creado.
  */
 export const createTank = async (tankData: Partial<Tank>): Promise<Tank> => {
     const response = await api.post('/tanks', tankData);
     return response.data;
 };
 
 /**
  * @function updateTank
  * @description Actualiza la información de un tanque específico por su ID.
  * @param {string} id - El ID del tanque a actualizar.
  * @param {Partial<Tank>} tankData - Los datos a actualizar.
  * @returns {Promise<Tank>} El tanque con los datos actualizados.
  */
 export const updateTank = async (id: string, tankData: Partial<Tank>): Promise<Tank> => {
     const response = await api.put(`/tanks/${id}`, tankData);
     return response.data;
 };
 
 /**
  * @function deleteTank
  * @description Elimina un tanque por su ID.
  * @param {string} id - El ID del tanque a eliminar.
  * @returns {Promise<void>}
  */
 export const deleteTank = async (id: string): Promise<void> => {
     await api.delete(`/tanks/${id}`);
 }; 