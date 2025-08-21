import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet()); 
  app.use(compression()); 
  app.enableCors({
    origin: '*', 
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  app.setGlobalPrefix('api');
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, 
    forbidNonWhitelisted: true, 
    transform: true, 
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));

  app.useWebSocketAdapter(new IoAdapter(app));

  const config = new DocumentBuilder()
    .setTitle('API de Acuaponia SENA')
    .setDescription('Documentación de la API para el sistema de monitoreo de acuaponia.')
    .setVersion('1.0')
    .addBearerAuth() 
    .addTag('auth', 'Operaciones de Autenticación')
    .addTag('users', 'Gestión de Usuarios')
    .addTag('tanks', 'Gestión de Tanques')
    .addTag('sensors', 'Gestión de Sensores')
    .addTag('data', 'Entrada y consulta de datos de sensores')
    .addTag('reports', 'Generación de Reportes')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Aplicación corriendo en: http://localhost:${port}`);
  console.log(`📚 Documentación de API disponible en: http://localhost:${port}/api-docs`);
}
bootstrap();