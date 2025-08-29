/**
 * @file dashboard.controller.ts
 * @description Controlador para endpoints del dashboard
 * @version 1.2.0
 * @author Kevin
 * @since 1.0.0
 */
import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { GetDashboardDataDto } from './dto/get-dashboard-data.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * @method getDashboardData
   * @description Devuelve los datos agregados y de series de tiempo para el dashboard
   * @param {GetDashboardDataDto} filters - Filtros de tanque, fechas, usuario
   * @param {Pick<User, 'id' | 'role'>} user - Usuario autenticado
   * @returns {Promise<object>} Datos del dashboard
   */
  @Get()
  async getDashboardData(
    @Query() filters: GetDashboardDataDto,
    @CurrentUser() user: Pick<User, 'id' | 'role'>,
  ) {
    return this.dashboardService.getDashboardData(filters, user);
  }
}
