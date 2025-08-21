import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

/**
 * Configura y habilita la interfaz de Swagger (OpenAPI) para la aplicación.
 * @param app - La instancia de la aplicación NestJS.
 */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('API de Acuaponia')
    .setDescription('Documentación completa de los endpoints de la API para el sistema de acuaponia.')
    .setVersion('1.0')
    .addBearerAuth() 
    .addTag('Auth', 'Endpoints para Autenticación, Registro y Recuperación')
    .addTag('Users', 'Endpoints para la gestión de usuarios (ej. perfil)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Acuaponia API Docs',
  });
}