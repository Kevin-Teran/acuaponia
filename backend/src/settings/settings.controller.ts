import { Controller, Get, Put, Body, UseGuards, Req } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * @controller SettingsController
 * @description Gestiona las rutas para obtener y actualizar las configuraciones del usuario autenticado.
 */
@Controller('settings')
@UseGuards(JwtAuthGuard) // Protege todas las rutas, cualquier usuario logueado puede acceder.
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * @route   GET /api/settings
   * @desc    Obtiene las configuraciones del usuario que realiza la petición.
   */
  @Get()
  getSettings(@Req() req: any) {
    return this.settingsService.getSettings(req.user.id);
  }

  /**
   * @route   PUT /api/settings
   * @desc    Actualiza las configuraciones del usuario que realiza la petición.
   */
  @Put()
  updateSettings(@Req() req: any, @Body() settings: any) {
    return this.settingsService.updateSettings(req.user.id, settings);
  }
}