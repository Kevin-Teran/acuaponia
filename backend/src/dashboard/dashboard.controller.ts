/**
 * @file dashboard.controller.ts
 * @route /backend/src/dashboard
 * @description Controlador corregido con validación y logging mejorado
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Controller, Get, Query, UseGuards, Logger, BadRequestException } from '@nestjs/common';
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
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly usersService: UsersService,
  ) {}

  @Get('summary')
  async getSummary(@Query() filters: DashboardFiltersDto, @CurrentUser() user: User) {
    try {
      this.logger.log(`📊 [Summary] Usuario: ${user.email}, Filtros: ${JSON.stringify(filters)}`);
      
      const targetUserId = user.role === Role.ADMIN && filters.userId 
        ? filters.userId 
        : user.id;

      const summary = await this.dashboardService.getSummaryStats(targetUserId);
      
      this.logger.log(`✅ [Summary] Resumen obtenido exitosamente`);
      return summary;
    } catch (error) {
      this.logger.error(`❌ [Summary] Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('realtime')
  async getRealtimeData(@Query() filters: DashboardFiltersDto) {
    try {
      this.logger.log(`⚡ [Realtime] Filtros: ${JSON.stringify(filters)}`);

      if (!filters.tankId) {
        throw new BadRequestException('Se requiere tankId para obtener datos en tiempo real');
      }

      const realtimeData = await this.dashboardService.getRealtimeData(filters.tankId);
      
      this.logger.log(`✅ [Realtime] Datos obtenidos exitosamente`);
      return realtimeData;
    } catch (error) {
      this.logger.error(`❌ [Realtime] Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('historical')
  async getHistoricalData(@Query() filters: DashboardFiltersDto, @CurrentUser() user: User) {
    try {
      this.logger.log(`📈 [Historical] Usuario: ${user.email}, Filtros: ${JSON.stringify(filters)}`);

      if (!filters.tankId) {
        throw new BadRequestException('Se requiere tankId para obtener datos históricos');
      }

      const historicalData = await this.dashboardService.getChartData(
        filters.tankId,
        filters.sensorType as sensors_type,
        filters.range,
        filters.startDate,
        filters.endDate,
      );

      this.logger.log(`✅ [Historical] Datos obtenidos exitosamente`);
      return historicalData;
    } catch (error) {
      this.logger.error(`❌ [Historical] Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('tanks-overview')
  getTanksOverview() {
    return 'Not implemented yet.';
  }

  @Get('users')
  @Roles(Role.ADMIN)
  async getUsersList(@CurrentUser() user: User) {
    try {
      this.logger.log(`👥 [Users] Admin solicitando lista de usuarios: ${user.email}`);
      const users = await this.usersService.findAll();
      this.logger.log(`✅ [Users] ${users.length} usuarios obtenidos`);
      return users;
    } catch (error) {
      this.logger.error(`❌ [Users] Error: ${error.message}`, error.stack);
      throw error;
    }
  }
}