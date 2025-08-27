/**
 * @file update-sensor.dto.ts
 * @description Data Transfer Object (DTO) para la actualización parcial de un sensor.
 * Define la estructura y las validaciones para los datos que se pueden modificar.
 * @author Kevin Mariano (Documentado por Gemini)
 * @version 3.0.0
 * @since 1.0.0
 */

import { IsString, IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { SensorStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @class UpdateSensorDto
 * @description Define el cuerpo de la solicitud para actualizar un sensor existente.
 * Todas las propiedades son opcionales, permitiendo actualizaciones parciales.
 */
export class UpdateSensorDto {
  /**
   * @property name
   * @description El nuevo nombre del sensor. Debe ser una cadena de texto.
   * @type {string}
   * @optional
   * @example "Sensor de pH Piscina Principal"
   */
  @ApiProperty({
    description: 'El nuevo nombre del sensor.',
    example: 'Sensor de pH Piscina Principal',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  /**
   * @property status
   * @description El nuevo estado del sensor. Debe ser uno de los valores definidos en el enum SensorStatus.
   * @type {SensorStatus}
   * @optional
   * @example SensorStatus.MAINTENANCE
   */
  @ApiProperty({
    description: 'El nuevo estado del sensor.',
    enum: SensorStatus,
    example: SensorStatus.MAINTENANCE,
    required: false,
  })
  @IsEnum(SensorStatus)
  @IsOptional()
  status?: SensorStatus;

  /**
   * @property calibrationDate
   * @description La nueva fecha de la última calibración del sensor. Debe ser una fecha en formato ISO 8601.
   * @type {Date}
   * @optional
   * @example "2025-08-27T10:00:00.000Z"
   */
  @ApiProperty({
    description: 'La nueva fecha de la última calibración (formato ISO 8601).',
    example: '2025-08-27T10:00:00.000Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  calibrationDate?: Date;

  /**
   * @property tankId
   * @description El ID del nuevo tanque al que se asignará el sensor. Debe ser un UUID.
   * @type {string}
   * @optional
   * @example "a1b2c3d4-e5f6-7890-1234-567890abcdef"
   */
  @ApiProperty({
    description: 'El ID del nuevo tanque al que se reasignará el sensor.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  tankId?: string;
}