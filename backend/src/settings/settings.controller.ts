import { Controller, Get, Put, Body, UseGuards, Req, Query } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '@prisma/client';

/**
 * @controller SettingsController
 * @description Gestiona las rutas para obtener y actualizar las configuraciones de los usuarios.
 * @technical_requirements Protegido por JWT. Permite a los administradores consultar configuraciones de otros usuarios.
 */
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * @route   GET /api/settings
   * @desc    Obtiene las configuraciones del usuario. Si el solicitante es ADMIN, puede especificar un `userId` para consultar.
   * @param   {Request} req - La petición con los datos del usuario autenticado.
   * @param   {string} [userId] - (Opcional) El ID del usuario a consultar, solo para Admins.
   * @returns {Promise<any>} Las configuraciones del usuario.
   */
  @Get()
  getSettings(@Req() req: any, @Query('userId') userId?: string) {
    const currentUser = req.user as User;
    
    // Si el usuario es ADMIN y proporciona un userId, se usa ese ID.
    // De lo contrario, siempre se usa el ID del propio usuario que hace la petición.
    const targetUserId = currentUser.role === 'ADMIN' && userId ? userId : currentUser.id;
    
    return this.settingsService.getSettings(targetUserId);
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