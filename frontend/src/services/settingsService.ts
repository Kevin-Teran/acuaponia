import api from '../config/api';

/**
 * @function getSettings
 * @desc     Obtiene las configuraciones del usuario actual desde la API.
 * @returns  {Promise<any>} Una promesa que resuelve a un objeto con las configuraciones del usuario.
 */
export const getSettings = async (): Promise<any> => {
    const response = await api.get('/settings');
    return response.data;
};

/**
 * @function updateSetting
 * @desc     Actualiza una clave específica en las configuraciones del usuario en el backend.
 * @param    {string} settingsKey - La clave principal de configuración (ej. 'thresholds', 'notifications').
 * @param    {any} data - El objeto de datos a guardar bajo esa clave.
 * @returns  {Promise<any>} Las configuraciones actualizadas devueltas por el servidor.
 */
export const updateSetting = async (settingsKey: string, data: any): Promise<any> => {
    const payload = { [settingsKey]: data };
    const response = await api.put('/settings', payload);
    return response.data;
};