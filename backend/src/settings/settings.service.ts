import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client'; // Importación explícita para el tipo

/**
 * @class SettingsService
 * @description Contiene la lógica de negocio para las configuraciones de usuario.
 * Interactúa con el campo 'settings' de tipo JSON/LONGTEXT en la base de datos.
 */
@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /**
   * @method getSettings
   * @description Obtiene las configuraciones de un usuario.
   * @param {string} userId - El ID del usuario autenticado.
   * @returns {Promise<any>} Un objeto con las configuraciones. Devuelve un objeto vacío si no hay nada guardado.
   */
  async getSettings(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    
    // Devuelve un objeto vacío si 'settings' es nulo para evitar errores en el frontend.
    return user.settings || {};
  }

  /**
   * @method updateSettings
   * @description Actualiza las configuraciones de un usuario. Fusiona los ajustes existentes
   * con los nuevos para no sobrescribir otras configuraciones que el usuario pudiera tener.
   * @param {string} userId - El ID del usuario autenticado.
   * @param {any} settings - El objeto con las nuevas configuraciones a guardar.
   * @returns {Promise<{settings: any}>} Las configuraciones actualizadas.
   */
  async updateSettings(userId: string, settings: any): Promise<{ settings: any }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const currentSettings = (user.settings as object) || {};
    const newSettings = { ...currentSettings, ...settings };

    return this.prisma.user.update({
      where: { id: userId },
      data: { 
        settings: newSettings 
      },
      select: { settings: true }
    });
  }
}