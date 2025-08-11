import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { TankStatus } from '@prisma/client';

export class CreateTankDto {
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre del tanque es obligatorio.' })
  name: string;

  @IsString({ message: 'La ubicación debe ser un texto.' })
  @IsNotEmpty({ message: 'La ubicación del tanque es obligatoria.' })
  location: string;

  @IsEnum(TankStatus, { message: 'El estado seleccionado no es válido.' })
  @IsOptional()
  status?: TankStatus;
  
  @IsString()
  @IsOptional()
  userId?: string;
}