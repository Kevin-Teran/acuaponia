import { IsString, IsNotEmpty, IsEnum, IsDateString } from 'class-validator';
import { SensorType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO (Data Transfer Object) para la creación de un nuevo sensor.
 * Define la estructura y validaciones de los datos de entrada.
 */
export class CreateSensorDto {
  /**
   * Nombre descriptivo del sensor.
   * @example "Sensor de pH Piscina 1"
   */
  @ApiProperty({ description: 'Nombre descriptivo del sensor.', example: 'Sensor de pH Piscina 1' })
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre del sensor es obligatorio.' })
  name: string;

  /**
   * Identificador único del hardware del sensor.
   * @example "ph-sensor-xyz-123"
   */
  @ApiProperty({ description: 'Identificador único del hardware del sensor.', example: 'ph-sensor-xyz-123' })
  @IsString({ message: 'El ID de hardware debe ser un texto.' })
  @IsNotEmpty({ message: 'El ID de hardware es obligatorio.' })
  hardwareId: string;

  /**
   * Tipo de sensor, basado en el enum de Prisma.
   * @enum SensorType
   * @example "PH"
   */
  @ApiProperty({ enum: SensorType, description: 'Tipo de sensor.', example: 'PH' })
  @IsEnum(SensorType, { message: 'El tipo de sensor no es válido.' })
  type: SensorType;

  /**
   * Ubicación física o descriptiva del sensor.
   * @example "Extremo norte del tanque"
   */
  @ApiProperty({ description: 'Ubicación física o descriptiva del sensor.', example: 'Extremo norte del tanque' })
  @IsString({ message: 'La ubicación debe ser un texto.' })
  @IsNotEmpty({ message: 'La ubicación del sensor es obligatoria.' })
  location: string;

  /**
   * ID del tanque al que está asociado el sensor.
   * @example "clp7a8q9w0000dc08z1z1z1z1"
   */
  @ApiProperty({ description: 'ID del tanque al que está asociado el sensor.', example: 'clp7a8q9w0000dc08z1z1z1z1' })
  @IsString()
  @IsNotEmpty({ message: 'Debe seleccionar un tanque para el sensor.' })
  tankId: string;

  /**
   * Fecha de la última calibración en formato ISO 8601.
   * @example "2025-08-21T10:00:00.000Z"
   */
  @ApiProperty({ description: 'Fecha de la última calibración en formato ISO 8601.', example: '2025-08-21T10:00:00.000Z' })
  @IsDateString({}, { message: 'La fecha de calibración debe ser una fecha válida.' })
  calibrationDate: string;
}