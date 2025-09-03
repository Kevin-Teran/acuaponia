/**
 * @file get-latest-data.dto.ts
 * @route 
 * @description
 * @author Kevin Mariano
 * @version 1.2.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { IsOptional, IsString, IsEnum } from 'class-validator';
import { SensorType } from '@prisma/client';

export class GetLatestDataDto {
  @IsOptional()
  @IsString()
  tankId?: string;

  @IsOptional()
  @IsEnum(SensorType)
  type?: SensorType;
}