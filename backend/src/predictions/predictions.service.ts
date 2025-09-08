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

    const tank = await this.prisma.tank.findUnique({ where: { id: tankId } });
    if (!tank) {
      throw new NotFoundException(`Tanque con ID "${tankId}" no encontrado.`);
    }

    // --- CORRECCIÓN CLAVE: Se elimina el filtro de fecha para usar todo el historial ---
    const historicalData = await this.prisma.sensorData.findMany({
      where: {
        tankId,
        type,
      },
      orderBy: { timestamp: 'asc' },
    });

    if (historicalData.length < 2) {
      return {
        historical: historicalData, // Devolvemos los pocos datos que haya
        predicted: [],
        message: `No hay suficientes datos históricos para este sensor (se encontraron ${historicalData.length}, se requieren al menos 2).`,
      };
    }

    let predictionResult = [];

    if (type === SensorType.TEMPERATURE && tank.location && /^-?\d+\.\d+,-?\d+\.\d+$/.test(tank.location)) {
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
  
  // --- Cómo se obtiene la ubicación para la API de Clima ---
  private async getWeatherForecast(location: string, days: number) {
    // 1. El servicio recibe la 'location' del tanque (ej: "10.9639,-74.7964")
    const [lat, lon] = location.split(',');
    
    // 2. Se construye la URL de la API de OpenWeatherMap con esas coordenadas
    const url = `https://api.openweathermap.org/data/2.5/forecast/daily?lat=${lat}&lon=${lon}&cnt=${days}&appid=${this.weatherApiKey}&units=metric`;
    
    // 3. Se hace la llamada a la API externa para obtener el pronóstico
    const response = await firstValueFrom(this.httpService.get(url));
    return response.data.list.map((day: any) => ({
      date: new Date(day.dt * 1000),
      temp_max: day.temp.max,
    }));
  }

  private createWeatherPrediction(historicalData: any[], weatherForecast: any[]) {
    const lastHistoricalValue = historicalData[historicalData.length - 1].value;
    let currentPredictedValue = lastHistoricalValue;
    const predictedData = [];
    const trend = (historicalData[historicalData.length - 1].value - historicalData[0].value) / historicalData.length;

    weatherForecast.forEach((day) => {
      const weatherInfluence = day.temp_max;
      currentPredictedValue = currentPredictedValue * 0.4 + weatherInfluence * 0.5 + trend * 0.1;
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
    const timeDiff = lastPoint.timestamp.getTime() - firstPoint.timestamp.getTime();
    const valueDiff = lastPoint.value - firstPoint.value;
    const trend = timeDiff > 0 ? valueDiff / timeDiff : 0;
    
    const predictedData = [];
    for (let i = 1; i <= horizonDays; i++) {
      const newTimestamp = new Date(lastPoint.timestamp.getTime() + 86400000 * i);
      const predictedValue = lastPoint.value + trend * (86400000 * i);
      const noise = (Math.random() - 0.5) * (lastPoint.value * 0.02);
      predictedData.push({
        timestamp: newTimestamp,
        value: parseFloat((predictedValue + noise).toFixed(2)),
      });
    }
    return predictedData;
  }
}