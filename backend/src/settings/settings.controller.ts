import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * @controller SettingsController
 * @description Gestiona las rutas para obtener y actualizar las configuraciones del usuario autenticado.
 * Todas las rutas están protegidas por el guard JWT, asegurando que solo usuarios logueados puedan acceder.
 */
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * @route   GET /api/settings
   * @desc    Obtiene las configuraciones del usuario que realiza la petición.
   * @param   {Request} req - La petición con los datos del usuario autenticado.
   * @returns {Promise<any>} Las configuraciones del usuario.
   */
  @Get()
  getSettings(@Req() req: any) {
    // req.user.id es añadido por el JwtAuthGuard
    return this.settingsService.getSettings(req.user.id);
  }

  /**
   * @route   PUT /api/settings
   * @desc    Actualiza las configuraciones del usuario que realiza la petición.
   * @param   {Request} req - La petición con los datos del usuario autenticado.
   * @param   {any} settings - El cuerpo de la petición con las nuevas configuraciones.
   * @returns {Promise<any>} Las configuraciones actualizadas.
   */
  @Put()
  updateSettings(@Req() req: any, @Body() settings: any) {
    return this.settingsService.updateSettings(req.user.id, settings);
  }
}