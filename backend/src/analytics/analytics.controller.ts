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
import { User, Role, SensorType } from '@prisma/client';
import { AnalyticsFiltersDto, CorrelationFiltersDto } from './dto';

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
  getDataDateRange(
    @CurrentUser() user: User, 
    @Query('userId') userId?: string
  ) {
    const targetUserId = user.role === Role.ADMIN && userId ? userId : user.id;
    return this.analyticsService.getDataDateRange(targetUserId);
  }

  /**
   * @route GET /analytics/kpis
   * @description Endpoint para obtener métricas KPI basadas en filtros.
   * @param {AnalyticsFiltersDto} filters - Filtros de consulta
   * @param {User} user - Usuario autenticado
   * @returns {Promise<any>} Métricas KPI
   */
  @Get('kpis')
  getKpis(
    @Query() filters: AnalyticsFiltersDto, 
    @CurrentUser() user: User
  ) {
    return this.analyticsService.getKpis(filters, user);
  }

  /**
   * @route GET /analytics/time-series
   * @description Endpoint para obtener datos de series temporales.
   * @param {AnalyticsFiltersDto} filters - Filtros de consulta
   * @param {User} user - Usuario autenticado
   * @returns {Promise<any>} Datos de series temporales
   */
  @Get('time-series')
  getTimeSeries(
    @Query() filters: AnalyticsFiltersDto, 
    @CurrentUser() user: User
  ) {
    return this.analyticsService.getTimeSeries(filters, user);
  }

  /**
   * @route GET /analytics/alerts-summary
   * @description Endpoint para obtener resumen de alertas.
   * @param {AnalyticsFiltersDto} filters - Filtros de consulta
   * @param {User} user - Usuario autenticado
   * @returns {Promise<any>} Resumen de alertas
   */
  @Get('alerts-summary')
  getAlertsSummary(
    @Query() filters: AnalyticsFiltersDto, 
    @CurrentUser() user: User
  ) {
    return this.analyticsService.getAlertsSummary(filters, user);
  }

  /**
   * @route GET /analytics/correlations
   * @description Endpoint para obtener correlaciones entre sensores.
   * @param {CorrelationFiltersDto} filters - Filtros de correlación
   * @param {User} user - Usuario autenticado
   * @returns {Promise<any>} Datos de correlación
   */
  @Get('correlations')
  getCorrelations(
    @Query() filters: CorrelationFiltersDto, 
    @CurrentUser() user: User
  ) {
    return this.analyticsService.getCorrelations(filters, user);
  }
}