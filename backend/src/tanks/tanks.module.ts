import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TanksService } from './tanks.service';
import { TanksController } from './tanks.controller';
import { Tank } from '../entities/tank.entity';

/**
 * Módulo de tanques
 * @class TanksModule
 * @description Configura el módulo de gestión de tanques
 */
@Module({
  imports: [TypeOrmModule.forFeature([Tank])],
  controllers: [TanksController],
  providers: [TanksService],
  exports: [TanksService],
})
export class TanksModule {}