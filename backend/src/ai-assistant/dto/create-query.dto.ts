/**
 * @file create-query.dto.ts
 * @route backend/src/ai-assistant/dto/
 * @description 
 * @author kevin mariano & Deiner
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { IsString, MinLength } from 'class-validator';

export class CreateQueryDto {
@IsString({ message: 'La pregunta debe ser un texto.' })
@MinLength(1, { message: 'La pregunta no puede estar vacía.' })
  pregunta: string;
}
