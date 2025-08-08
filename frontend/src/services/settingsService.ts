import api from '../config/api';

/**
 * @desc     Obtiene las configuraciones del usuario actual desde la API.
 * @returns  {Promise<any>} Una promesa que resuelve a un objeto de configuraciones.
 */
export const getSettings = async (): Promise<any> => {
    const response = await api.get('/settings');
    return response.data;
};

/**
 * @desc     Actualiza una clave específica en las configuraciones del usuario.
 * @param    {string} settingsKey - La clave principal de configuración (ej. 'thresholds').
 * @param    {any} data - El objeto de datos a guardar bajo esa clave.
 * @returns  {Promise<any>} Las configuraciones actualizadas.
 */
export const updateSetting = async (settingsKey: string, data: any): Promise<any> => {
    const payload = { [settingsKey]: data };
    const response = await api.put('/settings', payload);
    return response.data;
};