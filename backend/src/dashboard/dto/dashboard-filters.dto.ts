/**
 * @file dashboard-filters.dto.ts
 * @route 
 * @description DTO para filtros del dashboard.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { SensorType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class DashboardFiltersDto {
  @ApiProperty({ description: 'ID del usuario (solo para admins)', required: false })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'ID del tanque específico', required: false })
  @IsOptional()
  @IsString()
  tankId?: string;

  @ApiProperty({ description: 'Tipo de sensor específico', enum: SensorType, required: false })
  @IsOptional()
  @IsEnum(SensorType)
  sensorType?: SensorType;

  @ApiProperty({ description: 'Fecha de inicio para datos históricos', required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ description: 'Fecha de fin para datos históricos', required: false })
  @IsOptional()
  @IsString()
  endDate?: string;
}