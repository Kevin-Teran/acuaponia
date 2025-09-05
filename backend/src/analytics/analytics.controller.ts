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
import { User } from '@prisma/client';
import { AnalyticsFiltersDto } from './dto/analytics-filters.dto';
import { CorrelationFiltersDto } from './dto/correlation-filters.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * @route GET /analytics/kpis
   * @description Endpoint para obtener los KPIs.
   * @param {AnalyticsFiltersDto} filters - Filtros de la consulta.
   * @param {User} user - Usuario autenticado.
   * @returns {Promise<any>} KPIs calculados.
   */
  @Get('kpis')
  getKpis(@Query() filters: AnalyticsFiltersDto, @CurrentUser() user: User) {
    return this.analyticsService.getKpis(filters, user);
  }

  /**
   * @route GET /analytics/time-series
   * @description Endpoint para obtener datos para series de tiempo.
   * @param {AnalyticsFiltersDto} filters - Filtros de la consulta.
   * @param {User} user - Usuario autenticado.
   * @returns {Promise<any>} Datos para series de tiempo.
   */
  @Get('time-series')
  getTimeSeries(
    @Query() filters: AnalyticsFiltersDto,
    @CurrentUser() user: User,
  ) {
    return this.analyticsService.getTimeSeries(filters, user);
  }

  /**
   * @route GET /analytics/alerts-summary
   * @description Endpoint para obtener un resumen de alertas.
   * @param {AnalyticsFiltersDto} filters - Filtros de la consulta.
   * @param {User} user - Usuario autenticado.
   * @returns {Promise<any>} Resumen de alertas.
   */
  @Get('alerts-summary')
  getAlertsSummary(
    @Query() filters: AnalyticsFiltersDto,
    @CurrentUser() user: User,
  ) {
    return this.analyticsService.getAlertsSummary(filters, user);
  }

  /**
   * @route GET /analytics/correlations
   * @description Endpoint para obtener datos de correlación entre dos sensores.
   * @param {CorrelationFiltersDto} filters - Filtros de la consulta.
   * @param {User} user - Usuario autenticado.
   * @returns {Promise<any>} Datos para el gráfico de dispersión.
   */
   @Get('correlations')
   getCorrelations(
     @Query() filters: CorrelationFiltersDto,
     @CurrentUser() user: User,
   ) {
     return this.analyticsService.getCorrelations(filters, user);
   }
}