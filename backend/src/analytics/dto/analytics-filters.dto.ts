/**
 * @file analytics-filters.dto.ts
 * @route backend/src/analytics/dto/
 * @description DTO para los filtros de las consultas de analíticas.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { SensorType } from '@prisma/client';

export class AnalyticsFiltersDto {
  /**
   * @description ID del usuario (opcional, solo para administradores).
   * @example 'clx...'
   */
  @IsOptional()
  @IsString()
  userId?: string;

  /**
   * @description ID del tanque (opcional).
   * @example 'clx...'
   */
  @IsOptional()
  @IsString()
  tankId?: string;

  /**
   * @description Tipo de sensor (opcional).
   * @enum {SensorType}
   * @example SensorType.TEMPERATURE
   */
  @IsOptional()
  @IsEnum(SensorType)
  sensorType?: SensorType;

  /**
   * @description Fecha de inicio para el rango de la consulta.
   * @example '2025-01-01T00:00:00.000Z'
   */
  @IsDateString()
  startDate: string;

  /**
   * @description Fecha de fin para el rango de la consulta.
   * @example '2025-01-31T23:59:59.999Z'
   */
  @IsDateString()
  endDate: string;
}