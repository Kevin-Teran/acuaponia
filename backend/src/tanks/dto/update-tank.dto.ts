import { IsString, IsOptional, IsEnum } from 'class-validator';
import { TankStatus } from '@prisma/client';

export class UpdateTankDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsEnum(TankStatus)
  @IsOptional()
  status?: TankStatus;
}