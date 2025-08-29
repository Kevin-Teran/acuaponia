/**
 * @file dashboard.controller.ts
 * @description Controlador para manejar las peticiones HTTP relacionadas con el dashboard.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */
import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';
import { GetDashboardDataDto } from './dto/get-dashboard-data.dto';
import { Request } from 'express';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * @route GET /dashboard
   * @description Endpoint para obtener los datos del dashboard.
   * @param {GetDashboardDataDto} query - DTO con los filtros de la consulta.
   * @param {Request} req - Objeto de la solicitud HTTP, contiene el usuario autenticado.
   * @returns {Promise<object>} Los datos procesados del dashboard.
   */
  @Get()
  @ApiOperation({ summary: 'Obtener datos para el dashboard con filtros' })
  findAll(@Query() query: GetDashboardDataDto, @Req() req: Request) {
    return this.dashboardService.getDashboardData(query, req.user);
  }
}