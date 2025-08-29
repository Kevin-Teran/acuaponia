/**
 * @file get-dashboard-data.dto.ts
 * @description Data Transfer Object para validar los query params al solicitar datos del dashboard.
 * @author Kevin Mariano
 * @version 1.1.0 
 * @since 1.0.0
 */
 import { ApiPropertyOptional } from '@nestjs/swagger';
 import { IsISO8601, IsOptional, IsString } from 'class-validator';
 
 export class GetDashboardDataDto {
   @ApiPropertyOptional({ description: 'Filtrar por usuario (solo ADMIN)' })
   @IsOptional()
   @IsString()
   userId?: string;
 
   @ApiPropertyOptional({ description: 'Filtrar por tanque' })
   @IsOptional()
   @IsString()
   tankId?: string;
 
   @ApiPropertyOptional({ description: 'Fecha inicio ISO-8601' })
   @IsOptional()
   @IsISO8601()
   startDate?: string;
 
   @ApiPropertyOptional({ description: 'Fecha fin ISO-8601' })
   @IsOptional()
   @IsISO8601()
   endDate?: string;
 }
 