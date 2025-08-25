/**
 * @file create-sensor.dto.ts
 * @description DTO para la creación de un sensor.
 * @author Kevin Mariano
 * @version 5.0.0
 * @since 1.0.0
 */
import { IsString, IsNotEmpty, IsEnum, IsDateString } from 'class-validator';
import { SensorType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @class CreateSensorDto
 * @description Define la estructura y validaciones para crear un nuevo sensor.
 * La ubicación se hereda del tanque asociado y no es una propiedad directa del sensor.
 */
export class CreateSensorDto {
  /**
   * @property {string} name - Nombre descriptivo del sensor.
   * @example "Sensor de pH Piscina Tilapias"
   */
  @ApiProperty({ description: 'Nombre descriptivo del sensor.', example: 'Sensor de pH Piscina Tilapias' })
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre del sensor es obligatorio.' })
  name: string;

  /**
   * @property {string} hardwareId - Identificador único del hardware físico del sensor.
   * @example "ph-sensor-xyz-123"
   */
  @ApiProperty({ description: 'Identificador único del hardware del sensor.', example: 'ph-sensor-xyz-123' })
  @IsString({ message: 'El ID de hardware debe ser un texto.' })
  @IsNotEmpty({ message: 'El ID de hardware es obligatorio.' })
  hardwareId: string;

  /**
   * @property {SensorType} type - El tipo de medición que realiza el sensor.
   * @enum SensorType
   * @example "PH"
   */
  @ApiProperty({ enum: SensorType, description: 'Tipo de sensor.', example: 'PH' })
  @IsEnum(SensorType, { message: 'El tipo de sensor no es válido.' })
  type: SensorType;

  /**
   * @property {string} tankId - ID del tanque al que está asociado el sensor.
   * @example "clp7a8q9w0000dc08z1z1z1z1"
   */
  @ApiProperty({ description: 'ID del tanque al que está asociado el sensor.', example: 'clp7a8q9w0000dc08z1z1z1z1' })
  @IsString()
  @IsNotEmpty({ message: 'Debe seleccionar un tanque para el sensor.' })
  tankId: string;

  /**
   * @property {string} calibrationDate - Fecha de la última calibración en formato ISO 8601.
   * @example "2025-08-25T10:00:00.000Z"
   */
  @ApiProperty({ description: 'Fecha de la última calibración.', example: '2025-08-25T10:00:00.000Z' })
  @IsDateString({}, { message: 'La fecha de calibración debe ser una fecha válida.' })
  calibrationDate: string;
}