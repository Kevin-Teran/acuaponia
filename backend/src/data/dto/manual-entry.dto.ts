import { IsNotEmpty, IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * @class SensorEntry
 * @description Define la estructura de una única entrada de datos de sensor.
 */
class SensorEntry {
  @IsString()
  @IsNotEmpty()
  sensorId: string;

  @IsNumber()
  value: number;
}

/**
 * @class ManualEntryDto
 * @description DTO para validar el cuerpo de la petición de envío manual de datos.
 * Debe contener un array de objetos SensorEntry.
 */
export class ManualEntryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SensorEntry)
  entries: SensorEntry[];
}