/**
 * @file find-sensors.dto.ts
 * @route 
 * @description 
 * @author Kevin Mariano
 * @version 1.0.1
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { IsOptional, IsString } from 'class-validator';

export class FindSensorsDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  tankId?: string;
}