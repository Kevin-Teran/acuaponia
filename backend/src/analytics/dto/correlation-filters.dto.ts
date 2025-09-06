/**
 * @file correlation-filters.dto.ts
 * @route backend/src/analytics/dto/
 * @description DTO para los filtros de las consultas de correlación - VERSIÓN CORREGIDA.
 * @author kevin mariano
 * @version 2.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';
import { SensorType } from '@prisma/client';

export class CorrelationFiltersDto {
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
   * @description ID del sensor específico (opcional).
   * @example 'clx...'
   */
  @IsOptional()
  @IsString()
  sensorId?: string;

  /**
   * @description Rango de tiempo para la consulta (día, semana, mes, año).
   * @example 'week'
   */
  @IsOptional()
  @IsString()
  range?: string;

  /**
   * @description Fecha de inicio para el rango de la consulta.
   * @example '2025-01-01T00:00:00.000Z'
   */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /**
   * @description Fecha de fin para el rango de la consulta.
   * @example '2025-01-31T23:59:59.999Z'
   */
  @IsOptional()
  @IsDateString()
  endDate?: string;

  /**
   * @description Tipo de sensor para el eje X.
   * @enum {SensorType}
   * @example SensorType.TEMPERATURE
   */
  @IsOptional()
  @IsEnum(SensorType, { message: 'El tipo de sensor X debe ser válido' })
  @Transform(({ value }) => value === '' || value === 'undefined' ? SensorType.TEMPERATURE : value)
  sensorTypeX?: SensorType = SensorType.TEMPERATURE;

  /**
   * @description Tipo de sensor para el eje Y.
   * @enum {SensorType}
   * @example SensorType.PH
   */
  @IsOptional()
  @IsEnum(SensorType, { message: 'El tipo de sensor Y debe ser válido' })
  @Transform(({ value }) => value === '' || value === 'undefined' ? SensorType.PH : value)
  sensorTypeY?: SensorType = SensorType.PH;
}