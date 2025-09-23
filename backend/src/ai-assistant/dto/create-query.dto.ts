import { IsString, MinLength } from 'class-validator';

export class CreateQueryDto {
@IsString({ message: 'La pregunta debe ser un texto.' })
  // Se cambia MinLength a 1 para permitir respuestas cortas como "si" u "ok"
@MinLength(1, { message: 'La pregunta no puede estar vacía.' })
  pregunta: string;
}
