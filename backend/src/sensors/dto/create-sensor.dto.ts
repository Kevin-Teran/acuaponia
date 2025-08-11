import { IsString, IsNotEmpty, IsEnum, IsDateString } from 'class-validator';
import { SensorType } from '@prisma/client';

export class CreateSensorDto {
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre del sensor es obligatorio.' })
  name: string;

  @IsString({ message: 'El ID de hardware debe ser un texto.' })
  @IsNotEmpty({ message: 'El ID de hardware es obligatorio.' })
  hardwareId: string;

  @IsEnum(SensorType, { message: 'El tipo de sensor no es válido.' })
  type: SensorType;

  @IsString()
  @IsNotEmpty({ message: 'Debe seleccionar un tanque para el sensor.' })
  tankId: string;

  @IsDateString({}, { message: 'La fecha de calibración debe ser una fecha válida.' })
  calibrationDate: Date;
}