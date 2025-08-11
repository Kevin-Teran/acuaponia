import { IsNotEmpty, IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SensorEntry {
  @IsString()
  @IsNotEmpty()
  sensorId: string;

  @IsNumber()
  value: number;
}

export class ManualEntryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SensorEntry)
  entries: SensorEntry[];
}