import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { TankStatus } from '@prisma/client';

export class CreateTankDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsEnum(TankStatus)
  @IsOptional()
  status?: TankStatus;
  
  @IsString()
  @IsOptional()
  userId?: string;
}