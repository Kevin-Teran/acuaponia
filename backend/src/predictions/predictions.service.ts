/**
 * @file predictions.service.ts
 * @route backend/src/predictions
 * @description Lógica de negocio para la generación de predicciones combinando historial y clima.
 * @author Kevin Mariano 
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeneratePredictionDto } from './dto/generate-prediction.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SensorType } from '@prisma/client';

@Injectable()
export class PredictionsService {
  private readonly weatherApiKey: string;
  private readonly logger = new Logger(PredictionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.weatherApiKey = this.configService.get<string>(
      'OPENWEATHERMAP_API_KEY',
    );
    if (!this.weatherApiKey) {
      throw new Error(
        'La clave de API de OpenWeatherMap no está configurada en el archivo .env',
      );
    }
  }

  async generatePrediction(generatePredictionDto: GeneratePredictionDto) {
    const { tankId, type, horizon } = generatePredictionDto;

    const tank = await this.prisma.tank.findUnique({
      where: { id: tankId },
      include: { sensors: true },
    });
    if (!tank) {
      throw new NotFoundException(`Tanque con ID "${tankId}" no encontrado.`);
    }

    const hasSensor = tank.sensors.some((s) => s.type === type);
    if (!hasSensor) {
      throw new BadRequestException(
        `El tanque no tiene un sensor del tipo ${type}.`,
      );
    }

    const historicalData = await this.prisma.sensorData.findMany({
      where: {
        tankId,
        type,
      },
      orderBy: { timestamp: 'asc' },
    });

    if (historicalData.length < 2) {
      return {
        historical: historicalData,
        predicted: [],
        message: `No hay suficientes datos históricos para este sensor (se encontraron ${historicalData.length}, se requieren al menos 2).`,
      };
    }

    let predictionResult = [];

    if (
      type === SensorType.TEMPERATURE &&
      tank.location &&
      /^-?\d+\.\d+,-?\d+\.\d+$/.test(tank.location)
    ) {
      try {
        const weatherForecast = await this.getWeatherForecast(
          tank.location,
          horizon,
        );
        predictionResult = this.createWeatherPrediction(
          historicalData,
          weatherForecast,
        );
      } catch (error) {
        this.logger.error(
          `Fallo en API de clima, usando predicción estadística: ${error.message}`,
        );
        predictionResult = this.createStatisticalPrediction(
          historicalData,
          horizon,
        );
      }
    } else {
      predictionResult = this.createStatisticalPrediction(
        historicalData,
        horizon,
      );
    }

    return {
      historical: historicalData,
      predicted: predictionResult,
      message: 'Predicción generada exitosamente.',
    };
  }

  private async getWeatherForecast(location: string, days: number) {
    const [lat, lon] = location.split(',');

    const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&cnt=${days}&appid=${this.weatherApiKey}&units=metric`;

    const response = await firstValueFrom(this.httpService.get(url));

    if (!response.data?.daily) {
      throw new Error('Respuesta inválida de la API de OpenWeatherMap.');
    }

    return response.data.daily.slice(0, days).map((day: any) => ({
      date: new Date(day.dt * 1000),
      temp_max: day.temp.max,
    }));
  }

  private createWeatherPrediction(historicalData: any[], weatherForecast: any[]) {
    const lastHistoricalValue = historicalData[historicalData.length - 1].value;
    let currentPredictedValue = lastHistoricalValue;
    const predictedData = [];
    const trend =
      (historicalData[historicalData.length - 1].value -
        historicalData[0].value) /
      historicalData.length;

    weatherForecast.forEach((day) => {
      const weatherInfluence = day.temp_max;
      currentPredictedValue =
        currentPredictedValue * 0.4 +
        weatherInfluence * 0.5 +
        trend * 0.1;
      predictedData.push({
        timestamp: day.date,
        value: parseFloat(currentPredictedValue.toFixed(2)),
      });
    });
    return predictedData;
  }

  private createStatisticalPrediction(historicalData: any[], horizonDays: number) {
    const lastPoint = historicalData[historicalData.length - 1];
    const firstPoint = historicalData[0];
    const timeDiff =
      lastPoint.timestamp.getTime() - firstPoint.timestamp.getTime();
    const valueDiff = lastPoint.value - firstPoint.value;
    const trend = timeDiff > 0 ? valueDiff / timeDiff : 0;

    const predictedData = [];
    for (let i = 1; i <= horizonDays; i++) {
      const newTimestamp = new Date(
        lastPoint.timestamp.getTime() + 86400000 * i,
      );
      const predictedValue = lastPoint.value + trend * (86400000 * i);

      const noiseFactor =
        lastPoint.type === SensorType.PH ? 0.005 : 0.02;

      const noise = (Math.random() - 0.5) * (lastPoint.value * noiseFactor);

      predictedData.push({
        timestamp: newTimestamp,
        value: parseFloat((predictedValue + noise).toFixed(2)),
      });
    }
    return predictedData;
  }
}