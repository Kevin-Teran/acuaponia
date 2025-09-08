/**
 * @file generate-prediction.dto.ts
 * @route backend/src/predictions/dto
 * @description DTO para solicitar la generación de una predicción.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, IsEnum, Min, Max } from 'class-validator';
import { SensorType } from '@prisma/client';

export class GeneratePredictionDto {
  @ApiProperty({
    description: 'ID del tanque para la predicción',
    example: 'clx0z5j0f0000qg1j3f8b9k4c',
  })
  @IsString()
  @IsNotEmpty()
  tankId: string;

  @ApiProperty({
    description: 'Tipo de sensor a predecir (actualmente solo TEMPERATURA está soportado con clima)',
    enum: SensorType,
    example: SensorType.TEMPERATURE,
  })
  @IsEnum(SensorType)
  @IsNotEmpty()
  type: SensorType;

  @ApiProperty({
    description: 'Horizonte de tiempo de la predicción en días (7-15)',
    example: 7,
  })
  @IsInt()
  @Min(7)
  @Max(15) 
  @IsNotEmpty()
  horizon: number;
}