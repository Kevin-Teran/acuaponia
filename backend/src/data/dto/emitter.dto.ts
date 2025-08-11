import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class EmitterControlDto {
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  sensorIds: string[];
}