/**
 * @file main.ts
 * @route backend/src
 * @description Configuración principal CORREGIDA para WebSocket
 * @author kevin mariano
 * @version 2.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import * as crypto from 'crypto';

if (!global.crypto) {
  // @ts-ignore
  global.crypto = crypto;
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { setupSwagger } from './utils/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'], // ✅ Habilitar logs detallados
  });
  
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  const frontendProtocol = process.env.FRONTEND_PROTOCOL || 'https';
  const frontendHost = process.env.FRONTEND_HOST || 'tecnoparqueatlantico.com';
  const frontendPort = process.env.FRONTEND_PORT; 
  const isStandardPort = (frontendPort === '80' && frontendProtocol === 'http') || 
                        (frontendPort === '443' && frontendProtocol === 'https');
  const frontendUrl = (isStandardPort || !frontendPort) 
    ? `${frontendProtocol}://${frontendHost}` 
    : `${frontendProtocol}://${frontendHost}:${frontendPort}`;

  logger.log(`🌐 Frontend URL configurada: ${frontendUrl}`);

  app.enableCors({
    origin: frontendUrl,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization, Accept',
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true, 
      },
      skipMissingProperties: false,
      skipNullProperties: false,
      skipUndefinedProperties: false,
    }),
  );

  setupSwagger(app);

  const port = process.env.PORT ? parseInt(process.env.PORT) : 5001;
  
  // 🔥 CORRECCIÓN CRÍTICA: Escuchar en 0.0.0.0 para permitir conexiones externas
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Backend corriendo en: http://0.0.0.0:${port}/api`);
  logger.log(`📄 Swagger disponible en: http://0.0.0.0:${port}/docs`);
  logger.log(`🔌 WebSocket path: /acuaponiaapi/socket.io/`);
  logger.log(`🌐 Permitiendo CORS desde: ${frontendUrl}`);
}

bootstrap();