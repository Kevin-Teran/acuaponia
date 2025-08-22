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