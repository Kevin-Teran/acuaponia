/**
 * @file main.ts
 * @route backend/src
 * @description Configuración principal de la aplicación con ValidationPipe corregido para Analytics.
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { setupSwagger } from './utils/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api');

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
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

  const port = process.env.PORT || 5001; 
  await app.listen(port);

  logger.log(`🚀 La aplicación está corriendo en: http://localhost:${port}/api`);
  logger.log(`📄 La documentación de Swagger está disponible en: http://localhost:${port}/docs`);
}
bootstrap();