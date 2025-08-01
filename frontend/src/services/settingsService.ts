import api from '../config/api';

/**
 * @interface Settings
 * @desc Define la estructura de las configuraciones del sistema.
 */
export interface Settings {
  key: string;
  value: any;
}

/**
 * @desc Obtiene todas las configuraciones del sistema desde la API.
 * @returns {Promise<Record<string, any>>} Un objeto con todas las configuraciones.
 */
export const getSettings = async (): Promise<Record<string, any>> => {
  const response = await api.get('/settings');
  // Transforma el array de clave-valor en un objeto fácil de usar
  return response.data.data.reduce((acc: Record<string, any>, setting: Settings) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
};

/**
 * @desc Actualiza una configuración específica en el sistema.
 * @param {string} key - La clave de la configuración a actualizar (ej. 'thresholds').
 * @param {any} value - El nuevo valor para la configuración.
 * @returns {Promise<Settings>} La configuración actualizada.
 */
export const updateSetting = async (key: string, value: any): Promise<Settings> => {
  const response = await api.put('/settings', { key, value });
  return response.data.data;
};