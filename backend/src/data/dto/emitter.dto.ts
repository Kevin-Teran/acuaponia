import { IsArray, IsString, IsNotEmpty } from 'class-validator';

/**
 * @class EmitterControlDto
 * @description DTO para validar el cuerpo de la petición al iniciar o detener simuladores.
 * Debe contener un array de IDs de sensores.
 */
export class EmitterControlDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  sensorIds: string[];
}