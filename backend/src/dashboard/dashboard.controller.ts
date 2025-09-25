/**
 * @file dashboard.controller.ts
 * @route /backend/src/dashboard
 * @description Controlador para los endpoints del dashboard.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, Role, sensors_type } from '@prisma/client'; 
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator'; 
import { UsersService } from '../users/users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly usersService: UsersService,
  ) {}

  @Get('summary')
  getSummary(@Query() filters: DashboardFiltersDto, @CurrentUser() user: User) {
    return this.dashboardService.getSummaryStats(user.id);
  }

  @Get('realtime')
  getRealtimeData(@Query() filters: DashboardFiltersDto) {
    return this.dashboardService.getRealtimeData(filters.tankId);
  }

  @Get('historical')
  getHistoricalData(@Query() filters: DashboardFiltersDto, @CurrentUser() user: User) {
    return this.dashboardService.getChartData(filters.tankId, filters.sensorType as sensors_type, filters.range, filters.startDate, filters.endDate);
  }

  @Get('tanks-overview')
  getTanksOverview() {
    return 'Not implemented yet.'
  }

  @Get('users')
  @Roles(Role.ADMIN) 
  getUsersList(@CurrentUser() user: User) {
    return this.usersService.findAll();
  }
}