import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Función principal para inicializar la aplicación NestJS
 * @async
 * @function bootstrap
 * @returns {Promise<void>} Promesa que se resuelve cuando la aplicación está iniciada
 * @throws {Error} Error si no se puede inicializar la aplicación
 * @example
 * // Inicializar la aplicación
 * bootstrap().catch(console.error);
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  
  // Configuración de CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  });

  // Configuración de validación global
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('Acuaponía API')
    .setDescription('API para sistema de monitoreo de acuaponía')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3001);
  console.log('🚀 Backend ejecutándose en http://localhost:3001');
  console.log('📚 Documentación API disponible en http://localhost:3001/api');
}

bootstrap();