import { IsString, IsNotEmpty, IsEnum, IsDateString } from 'class-validator';
import { SensorType } from '@prisma/client';

export class CreateSensorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  hardwareId: string;

  @IsEnum(SensorType)
  type: SensorType;

  @IsString()
  @IsNotEmpty()
  tankId: string;

  @IsDateString()
  calibrationDate: Date;
}