/**
 * @file prisma.module.ts
 * @route 
 * @description Extiende el PrismaClient para integrarse con el ciclo de vida de los módulos de NestJS.
 * Se encarga de conectar y desconectar la base de datos de forma segura.
 * Los métodos `$connect` y `$disconnect` son heredados directamente de PrismaClient después
 * de una generación exitosa del cliente.
 * @author Kevin Mariano 
 * @version 1.0.0 
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * @class PrismaService
 * @description Extiende el PrismaClient para integrarse con el ciclo de vida de los módulos de NestJS.
 * Se encarga de conectar y desconectar la base de datos de forma segura.
 * Los métodos `$connect` y `$disconnect` son heredados directamente de PrismaClient después
 * de una generación exitosa del cliente.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * @method onModuleInit
   * @description Se conecta a la base de datos cuando el módulo es inicializado por NestJS.
   * Este es un "hook" del ciclo de vida de NestJS que garantiza la conexión al arrancar la app.
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * @method onModuleDestroy
   * @description Se desconecta de la base de datos de forma segura cuando la aplicación se apaga.
   * Este es un "hook" del ciclo de vida de NestJS que previene fugas de conexión.
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}