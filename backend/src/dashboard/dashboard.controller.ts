/**
 * @file dashboard.controller.ts
 * @description Controlador para endpoints del dashboard con datos en tiempo real.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */
import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Obtener resumen general del dashboard' })
  getSummary(@Query() filters: DashboardFiltersDto, @Req() req) {
    return this.dashboardService.getSummary(filters, req.user);
  }

  @Get('realtime')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Obtener datos en tiempo real para gauges' })
  getRealtimeData(@Query() filters: DashboardFiltersDto, @Req() req) {
    return this.dashboardService.getRealtimeData(filters, req.user);
  }

  @Get('historical')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Obtener datos históricos para gráficos de línea' })
  getHistoricalData(@Query() filters: DashboardFiltersDto, @Req() req) {
    return this.dashboardService.getHistoricalData(filters, req.user);
  }

  @Get('tanks-overview')
  @Roles(Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Obtener vista general de tanques' })
  getTanksOverview(@Query() filters: DashboardFiltersDto, @Req() req) {
    return this.dashboardService.getTanksOverview(filters, req.user);
  }

  @Get('users-list')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Obtener lista de usuarios para filtro (solo admins)' })
  getUsersList(@Req() req) {
    return this.dashboardService.getUsersList(req.user);
  }
}
