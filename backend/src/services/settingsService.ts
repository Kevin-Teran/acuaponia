import { prisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

/**
 * @class SettingsService
 * @desc Servicio para la lógica de negocio de las configuraciones del sistema.
 */
export class SettingsService {

    /**
     * @desc Obtiene todas las configuraciones del sistema.
     * @returns {Promise<Array<{key: string, value: any}>>} Un array de objetos de configuración.
     */
    static async getSettings() {
        try {
            const settings = await prisma.systemConfig.findMany();
            // Parsea los valores JSON antes de devolverlos
            return settings.map(setting => {
                try {
                    return {
                        ...setting,
                        value: JSON.parse(setting.value)
                    };
                } catch (e) {
                    logger.warn(`Configuración con clave '${setting.key}' no es un JSON válido.`);
                    return { ...setting, value: setting.value }; // Devuelve como texto si no es JSON
                }
            });
        } catch (error) {
            logger.error('Error en SettingsService.getSettings:', error);
            throw new CustomError('Error al obtener las configuraciones', 500);
        }
    }

    /**
     * @desc Actualiza o crea una configuración del sistema.
     * @param {string} key - La clave única de la configuración (ej. 'thresholds').
     * @param {any} value - El valor de la configuración, que será almacenado como JSON.
     * @returns {Promise<any>} La configuración guardada.
     */
    static async updateSetting(key: string, value: any) {
        if (!key || value === undefined) {
            throw new CustomError('La clave y el valor son requeridos', 400);
        }

        try {
            const stringValue = JSON.stringify(value);

            const updatedSetting = await prisma.systemConfig.upsert({
                where: { key },
                update: { value: stringValue },
                create: { key, value: stringValue, description: `Configuración para ${key}` }
            });

            return {
                ...updatedSetting,
                value: JSON.parse(updatedSetting.value) 
            };
        } catch (error) {
            logger.error(`Error en SettingsService.updateSetting para la clave ${key}:`, error);
            throw new CustomError('Error al actualizar la configuración', 500);
        }
    }
}