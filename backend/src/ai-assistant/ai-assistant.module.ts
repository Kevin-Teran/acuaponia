import { Module } from '@nestjs/common';
import { AiAssistantService } from './ai-assistant.service';
import { AiAssistantController } from './ai-assistant.controller';

/**
 * Módulo del asistente IA
 * @class AiAssistantModule
 * @description Configura el módulo del chat con asistente de IA
 */
@Module({
  controllers: [AiAssistantController],
  providers: [AiAssistantService],
})
export class AiAssistantModule {}