/**
 * @file analytics.controller.ts
 * @route backend/src/analytics/
 * @description Controlador para los endpoints del módulo de analíticas.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, Role } from '@prisma/client';
import { AnalyticsFiltersDto } from './dto/analytics-filters.dto';
import { CorrelationFiltersDto } from './dto/correlation-filters.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * @route GET /analytics/data-range
   * @description Endpoint para obtener el rango de fechas de los datos de un usuario.
   * @param {User} user - Usuario autenticado.
   * @param {string} userId - ID del usuario a consultar (opcional, para admins).
   * @returns {Promise<{firstDataPoint: Date | null, lastDataPoint: Date | null}>}
   */
  @Get('data-range')
  getDataDateRange(@CurrentUser() user: User, @Query('userId') userId?: string) {
    const targetUserId = user.role === Role.ADMIN && userId ? userId : user.id;
    return this.analyticsService.getDataDateRange(targetUserId);
  }

  @Get('kpis')
  getKpis(@Query() filters: AnalyticsFiltersDto, @CurrentUser() user: User) {
    return this.analyticsService.getKpis(filters, user);
  }

  @Get('time-series')
  getTimeSeries(@Query() filters: AnalyticsFiltersDto, @CurrentUser() user: User) {
    return this.analyticsService.getTimeSeries(filters, user);
  }

  @Get('alerts-summary')
  getAlertsSummary(@Query() filters: AnalyticsFiltersDto, @CurrentUser() user: User) {
    return this.analyticsService.getAlertsSummary(filters, user);
  }

   @Get('correlations')
   getCorrelations(@Query() filters: CorrelationFiltersDto, @CurrentUser() user: User) {
     return this.analyticsService.getCorrelations(filters, user);
   }
}