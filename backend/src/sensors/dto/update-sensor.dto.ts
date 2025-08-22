import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { SensorStatus } from '@prisma/client';

export class UpdateSensorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(SensorStatus)
  @IsOptional()
  status?: SensorStatus;

  @IsDateString()
  @IsOptional()
  calibrationDate?: Date;
}