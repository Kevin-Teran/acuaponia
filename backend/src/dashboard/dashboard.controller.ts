/**
 * @file dashboard.controller.ts
 * @description Controlador para exponer los datos del Dashboard.
 * @author Kevin Mariano
 * @version 3.1.0
 */
import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common'; // Se añade Req
import { DashboardService } from './dashboard.service';
import { GetDashboardDataDto } from './dto/get-dashboard-data.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener datos consolidados para el Dashboard' })
  @ApiResponse({ status: 200, description: 'Datos obtenidos con éxito.' })
  getDashboardData(
    @Query() getDashboardDataDto: GetDashboardDataDto,
    @Req() req: any, // Obtenemos la request completa para acceder a req.user
  ) {
    // Pasamos el usuario autenticado al servicio
    return this.dashboardService.getDashboardData(getDashboardDataDto, req.user);
  }
}