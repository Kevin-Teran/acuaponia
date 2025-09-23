import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { CreateQueryDto } from './dto/create-query.dto';

@Controller('asistente') // Esto crea la ruta /asistente
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post() // Responde a peticiones POST a /asistente
  async createQuery(@Body(new ValidationPipe()) createQueryDto: CreateQueryDto) {
    const respuesta = await this.aiAssistantService.getAIResponse(
      createQueryDto.pregunta,
    );
    return { respuesta };
  }
}