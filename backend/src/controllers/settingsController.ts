import { Request, Response } from 'express';
import { SettingsService } from '../services/settingsService';
import { logger } from '../utils/logger';

/**
 * @desc     Obtiene todas las configuraciones del sistema.
 * @route    GET /api/settings
 * @access   Private (Admin)
 */
export const getSettingsController = async (req: Request, res: Response) => {
    const settings = await SettingsService.getSettings();
    res.status(200).json({
        success: true,
        data: settings,
    });
};

/**
 * @desc     Actualiza una configuración específica del sistema.
 * @route    PUT /api/settings
 * @access   Private (Admin)
 */
export const updateSettingsController = async (req: Request, res: Response) => {
    const { key, value } = req.body;
    
    const updatedSetting = await SettingsService.updateSetting(key, value);
    
    logger.info(`Configuración actualizada por admin: ${key}`);
    
    res.status(200).json({
        success: true,
        message: `Configuración '${key}' actualizada exitosamente.`,
        data: updatedSetting,
    });
};