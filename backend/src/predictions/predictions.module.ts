import { Module } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { PredictionsController } from './predictions.controller';

/**
 * Módulo de predicciones
 * @class PredictionsModule
 * @description Configura el módulo de predicciones y análisis predictivo
 */
@Module({
  controllers: [PredictionsController],
  providers: [PredictionsService],
})
export class PredictionsModule {}