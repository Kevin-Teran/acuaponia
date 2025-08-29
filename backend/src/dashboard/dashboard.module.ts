/**
 * @file src/dashboard/dashboard.module.ts
 * @description Módulo de NestJS para el Dashboard.
 * @author Kevin Mariano
 * @version 1.1.0
 * @since 1.0.0
 */

 import { Module } from '@nestjs/common';
 import { DashboardService } from './dashboard.service';
 import { DashboardController } from './dashboard.controller';
 import { PrismaModule } from '../prisma/prisma.module';
 
 @Module({
   imports: [PrismaModule],
   controllers: [DashboardController],
   providers: [DashboardService],
 })
 export class DashboardModule {}