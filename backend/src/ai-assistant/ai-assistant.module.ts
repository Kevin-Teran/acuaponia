import { Module } from '@nestjs/common';
import { AiAssistantController } from './ai-assistant.controller';
import { AiAssistantService } from './ai-assistant.service';
import { PrismaModule } from '../prisma/prisma.module'; // Importamos tu módulo de Prisma

@Module({
  imports: [PrismaModule], // Hacemos que Prisma esté disponible para este módulo
  controllers: [AiAssistantController],
  providers: [AiAssistantService],
})
export class AiAssistantModule {}