/**
 * @file ai-assistant.controller.ts
 * @route backend/src/ai-assistant
 * @description 
 * @author kevin mariano & Deiner
 * @version 1.0.1
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Controller, Post, Body, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { CreateQueryDto } from './dto/create-query.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('asistente')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async createQuery(
    @Body(new ValidationPipe()) createQueryDto: CreateQueryDto,
    @CurrentUser() user: Pick<User, 'id' | 'role'>,
  ) {
    const respuesta = await this.aiAssistantService.getAIResponse(
      createQueryDto.pregunta,
      user,
    );
    return { respuesta };
  }
}