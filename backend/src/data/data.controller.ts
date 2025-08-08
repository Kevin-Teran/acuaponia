import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('data')
@UseGuards(JwtAuthGuard)
export class DataController {
  // Aquí iría la lógica para obtener datos históricos, etc.
  // Por ahora, es un placeholder.
  @Get('historical')
  getHistoricalData(@Req() req) {
    return { message: `Datos históricos para el usuario ${req.user.email}` };
  }
}