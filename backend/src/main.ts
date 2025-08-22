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
    origin: 'http://localhost:3000', 
    credentials: true, 
  });

  app.use(cookieParser()); 

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  setupSwagger(app);

  const port = process.env.PORT || 5001;
  await app.listen(port);

  logger.log(`🚀 Aplicación corriendo en: http://localhost:${port}`);
  logger.log(`📚 Documentación de API disponible en: http://localhost:${port}/api-docs`);
}
bootstrap();