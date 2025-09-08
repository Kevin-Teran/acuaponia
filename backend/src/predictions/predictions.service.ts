/**
 * @file predictions.service.ts
 * @route backend/src/predictions
 * @description Lógica de negocio para predicciones. AHORA INCLUYE UMBRALES.
 * @author Kevin Mariano
 * @version 1.4.0
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
import { SensorData, SensorType } from '@prisma/client';

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
      this.logger.warn(
        'La clave de API de OpenWeatherMap no está configurada; las predicciones de temperatura usarán el método estadístico.',
      );
    }
  }

  async generatePrediction(generatePredictionDto: GeneratePredictionDto) {
    const { tankId, type, horizon } = generatePredictionDto;

    const tank = await this.prisma.tank.findUnique({
      where: { id: tankId },
      include: { user: true }, // Incluimos el usuario para obtener su ID
    });
    if (!tank) throw new NotFoundException(`Tanque con ID "${tankId}" no encontrado.`);
    if (!tank.userId) throw new BadRequestException('El tanque no está asociado a un usuario.');

    const hasSensor = await this.prisma.sensor.findFirst({ where: { tankId, type }});
    if (!hasSensor) throw new BadRequestException(`El tanque no tiene un sensor del tipo ${type}.`);

    const historicalData = await this.prisma.sensorData.findMany({
      where: { tankId, type },
      orderBy: { timestamp: 'asc' },
    });

    if (historicalData.length < 2) {
      return {
        message: `No hay suficientes datos históricos (se requieren al menos 2).`,
        predicted: [],
        historical: historicalData,
        thresholds: null,
      };
    }

    // ✨ MEJORA: Obtener los umbrales configurados por el usuario para este sensor
    const thresholds = await this.prisma.threshold.findUnique({
      where: {
        userId_sensorType: {
          userId: tank.userId,
          sensorType: type,
        },
      },
    });

    let predictionResult = [];
    // ... (lógica de predicción con clima o estadística, sin cambios)
     if (
      type === SensorType.TEMPERATURE &&
      this.weatherApiKey &&
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
        this.logger.error(`Fallo en API de clima, usando predicción estadística: ${error.message}`);
        predictionResult = this.createStatisticalPrediction(historicalData, horizon);
      }
    } else {
      predictionResult = this.createStatisticalPrediction(historicalData, horizon);
    }


    return {
      historical: historicalData,
      predicted: predictionResult,
      message: 'Predicción generada exitosamente.',
      thresholds, // Devolvemos los umbrales en la respuesta
    };
  }

  // ... (El resto de las funciones: getWeatherForecast, createWeatherPrediction, etc. se mantienen igual que la versión anterior)
  private async getWeatherForecast(location: string, days: number) {
    const [lat, lon] = location.split(',');
    const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&appid=${this.weatherApiKey}&units=metric`;
    const response = await firstValueFrom(this.httpService.get(url));
    if (!response.data?.daily) throw new Error('Respuesta inválida de la API de OpenWeatherMap.');
    return response.data.daily.slice(1, days + 1).map((day: any) => ({
      date: new Date(day.dt * 1000),
      temp_max: day.temp.max,
    }));
  }

  private createWeatherPrediction(
    historicalData: SensorData[],
    weatherForecast: any[],
  ) {
    const { trend, valueAtToday } = this.calculateTrend(historicalData);
    const predictedData = [{ timestamp: new Date(), value: parseFloat(valueAtToday.toFixed(2)) }];
    let lastPredictedValue = valueAtToday;
    weatherForecast.forEach((day, i) => {
      const newTimestamp = new Date(new Date().getTime() + 86400000 * (i + 1));
      const weatherInfluence = day.temp_max;
      const predictedValue = lastPredictedValue * 0.4 + weatherInfluence * 0.5 + (trend * 86400000 * 0.1);
      predictedData.push({
        timestamp: newTimestamp,
        value: parseFloat(predictedValue.toFixed(2)),
      });
      lastPredictedValue = predictedValue;
    });
    return predictedData;
  }

  private createStatisticalPrediction(
    historicalData: SensorData[],
    horizonDays: number,
  ) {
    const { valueAtToday, trend } = this.calculateTrend(historicalData);
    const predictedData = [{ timestamp: new Date(), value: parseFloat(valueAtToday.toFixed(2)) }];
    let lastPredictedValue = valueAtToday;
    for (let i = 1; i <= horizonDays; i++) {
      const newTimestamp = new Date(new Date().getTime() + 86400000 * i);
      const predictedValue = lastPredictedValue + trend * 86400000;
      const noiseFactor = historicalData[historicalData.length-1].type === SensorType.PH ? 0.005 : 0.02;
      const noise = (Math.random() - 0.5) * (lastPredictedValue * noiseFactor);
      const finalValue = parseFloat((predictedValue + noise).toFixed(2));
      predictedData.push({ timestamp: newTimestamp, value: finalValue });
      lastPredictedValue = finalValue;
    }
    return predictedData;
  }

  private calculateTrend(historicalData: SensorData[]) {
    const lastPoint = historicalData[historicalData.length - 1];
    const firstPoint = historicalData[0];
    const timeDiff = lastPoint.timestamp.getTime() - firstPoint.timestamp.getTime();
    const valueDiff = lastPoint.value - firstPoint.value;
    const trend = timeDiff > 0 ? valueDiff / timeDiff : 0;
    const timeSinceLastPoint = new Date().getTime() - lastPoint.timestamp.getTime();
    const valueAtToday = lastPoint.value + trend * timeSinceLastPoint;
    return { trend, valueAtToday };
  }
}