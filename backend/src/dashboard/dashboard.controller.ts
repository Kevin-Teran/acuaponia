import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResponseUtil } from '../common/utils/response.util';

/**
 * Controlador del dashboard
 * @class DashboardController
 * @description Maneja las rutas del dashboard principal
 */
@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  /**
   * Constructor del controlador del dashboard
   * @param {DashboardService} dashboardService - Servicio del dashboard
   */
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * Obtiene los datos del dashboard
   * @async
   * @param {any} req - Request con usuario autenticado
   * @param {string} [tankId] - ID del tanque específico
   * @param {string} [startDate] - Fecha de inicio (ISO string)
   * @param {string} [endDate] - Fecha de fin (ISO string)
   * @returns {Promise<any>} Datos del dashboard
   * @example
   * GET /dashboard?tankId=tank-uuid&startDate=2024-01-01&endDate=2024-01-31
   */
  @Get()
  @ApiOperation({ summary: 'Obtener datos del dashboard' })
  @ApiResponse({ status: 200, description: 'Datos del dashboard obtenidos exitosamente' })
  async getDashboard(
    @Request() req: any,
    @Query('tankId') tankId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters = {
      tankId,
      dateRange: {
        startDate: startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 días atrás por defecto
        endDate: endDate ? new Date(endDate) : new Date(),
      },
    };

    const dashboardData = await this.dashboardService.getDashboardData(req.user.id, filters);
    return ResponseUtil.success(dashboardData, 'Datos del dashboard obtenidos exitosamente');
  }
}