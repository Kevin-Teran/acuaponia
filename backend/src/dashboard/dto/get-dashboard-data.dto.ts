/**
 * @file get-dashboard-data.dto.ts
 * @description Data Transfer Object para validar los query params al solicitar datos del dashboard.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsDate, MaxDate, IsInt } from 'class-validator';

/**
 * @class GetDashboardDataDto
 * @description DTO para los filtros del dashboard.
 */
export class GetDashboardDataDto {
  /**
   * @property {number} [userId] - ID del usuario para filtrar los datos. Opcional.
   * @example 1
   */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  userId?: number;

  /**
   * @property {string} [tankId] - ID del tanque para filtrar los datos. Opcional.
   * @example 'clx123abc456'
   */
  @IsOptional()
  @IsString()
  tankId?: string;

  /**
   * @property {Date} [startDate] - Fecha de inicio para el rango de datos. Opcional.
   * @example '2025-08-01'
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  /**
   * @property {Date} [endDate] - Fecha de fin para el rango de datos. No puede ser una fecha futura. Opcional.
   * @example '2025-08-29'
   */
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @MaxDate(new Date(), { message: 'La fecha de fin no puede ser en el futuro.' })
  endDate?: Date;
}