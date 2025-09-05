/**
 * @file correlation-filters.dto.ts
 * @route backend/src/analytics/dto/
 * @description DTO para los filtros de las consultas de correlación.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */
import { IsEnum, IsNotEmpty } from 'class-validator';
import { SensorType } from '@prisma/client';
import { AnalyticsFiltersDto } from './analytics-filters.dto';

export class CorrelationFiltersDto extends AnalyticsFiltersDto {
  /**
   * @description Tipo de sensor para el eje X.
   * @enum {SensorType}
   * @example SensorType.TEMPERATURE
   */
  @IsNotEmpty()
  @IsEnum(SensorType)
  sensorTypeX: SensorType;

  /**
   * @description Tipo de sensor para el eje Y.
   * @enum {SensorType}
   * @example SensorType.PH
   */
  @IsNotEmpty()
  @IsEnum(SensorType)
  sensorTypeY: SensorType;
}