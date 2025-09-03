/**
 * @file dashboard.controller.ts
 * @route 
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
import { User, Role } from '@prisma/client'; 
import { DashboardFiltersDto } from './dto/dashboard-filters.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator'; 

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  getSummary(@Query() filters: DashboardFiltersDto, @CurrentUser() user: User) {
    return this.dashboardService.getSummary(filters, user);
  }

  @Get('realtime')
  getRealtimeData(@Query() filters: DashboardFiltersDto, @CurrentUser() user: User) {
    return this.dashboardService.getRealtimeData(filters, user);
  }

  @Get('historical')
  getHistoricalData(@Query() filters: DashboardFiltersDto, @CurrentUser() user: User) {
    return this.dashboardService.getHistoricalData(filters, user);
  }

  @Get('tanks-overview')
  getTanksOverview(@Query() filters: DashboardFiltersDto, @CurrentUser() user: User) {
    return this.dashboardService.getTanksOverview(filters, user);
  }

  @Get('users')
  @Roles(Role.ADMIN) 
  getUsersList(@CurrentUser() user: User) {
    return this.dashboardService.getUsersList(user);
  }
}