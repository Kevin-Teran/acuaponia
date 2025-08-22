import { IsOptional, IsString } from 'class-validator';

export class FindSensorsDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  tankId?: string;
}