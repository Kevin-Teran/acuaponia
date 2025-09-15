/**
 * @file prisma.module.ts
 * @route backend/src/prisma
 * @description Extiende PrismaClient para integrarse con el ciclo de vida de los módulos de NestJS.
 * Permite conectar y desconectar la base de datos de forma segura al iniciar o apagar la aplicación.
 * Los métodos `$connect` y `$disconnect` son heredados directamente de PrismaClient después
 * de ejecutar `prisma generate`.
 * @author Kevin Mariano
 * @version 1.0.1
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * @class PrismaService
 * @description Servicio que extiende PrismaClient para integrarse con NestJS.
 * Hereda automáticamente todos los modelos (sensorData, user, alert, etc.) generados por Prisma.
 * Implementa los hooks de ciclo de vida `OnModuleInit` y `OnModuleDestroy` para gestionar la conexión.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * @method onModuleInit
   * @description Conecta la aplicación a la base de datos cuando el módulo NestJS se inicializa.
   * Este hook garantiza que la conexión se establezca al arrancar la app.
   */
  async onModuleInit() {
    // @ts-ignore: TS no detecta dinámicamente $connect generado por Prisma
    await this.$connect();
  }

  /**
   * @method onModuleDestroy
   * @description Desconecta la aplicación de la base de datos cuando NestJS destruye el módulo.
   * Previene fugas de conexión y garantiza un cierre seguro de la base de datos.
   */
  async onModuleDestroy() {
    // @ts-ignore: TS no detecta dinámicamente $disconnect generado por Prisma
    await this.$disconnect();
  }
}