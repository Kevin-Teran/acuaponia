/**
 * @file prisma.service.ts
 * @description Servicio que extiende PrismaClient para integrarse con el ciclo de vida de NestJS.
 * Asegura que la conexión a la base de datos se establezca correctamente al iniciar la aplicación.
 * @version 1.0.0
 */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  /**
   * @description Método del ciclo de vida de NestJS. Se invoca una vez que el módulo ha sido inicializado.
   * Aquí, establecemos la conexión con la base de datos.
   */
  async onModuleInit() {
    await this.$connect();
  }
}