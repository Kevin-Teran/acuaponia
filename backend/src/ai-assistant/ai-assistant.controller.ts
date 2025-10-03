/**
 * @file ai-assistant.controller.ts
 * @route backend/src/ai-assistant
 * @description 
 * @author kevin mariano & Deiner
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { CreateQueryDto } from './dto/create-query.dto';

@Controller('asistente') 
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post() 
  async createQuery(@Body(new ValidationPipe()) createQueryDto: CreateQueryDto) {
    const respuesta = await this.aiAssistantService.getAIResponse(
      createQueryDto.pregunta,
    );
    return { respuesta };
  }
}