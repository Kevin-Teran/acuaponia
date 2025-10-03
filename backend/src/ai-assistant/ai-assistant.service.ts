/**
 * @file ai-assistant.service.ts
 * @route backend/src/ai-assistant
 * @description 
 * @author kevin mariano & Deiner
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sensors_type } from '@prisma/client';
import axios from 'axios';

@Injectable()
export class AiAssistantService {
  private readonly groqApiKey: string;

  constructor(private prisma: PrismaService) {
    this.groqApiKey = process.env.GROQ_API_KEY;
    if (!this.groqApiKey) {
      throw new Error('GROQ_API_KEY no está definida en el archivo .env');
    }
  }

  private async getSystemContext() {
    const activeTanksCount = await this.prisma.tank.count({});
    const unresolvedAlertsCount = await this.prisma.alert.count({ where: { resolvedAt: null } });
    const getSensorHistory = async (type: sensors_type) => {
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const readings = await this.prisma.sensorData.findMany({
        where: { type, timestamp: { gte: twelveHoursAgo } },
        orderBy: { timestamp: 'desc' },
      });
      if (readings.length === 0) return { latest: null, avg: null, min: null, max: null };
      const values = readings.map(r => r.value);
      const latest = values[0];
      const avg = values.reduce((acc, val) => acc + val, 0) / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      return { latest, avg, min, max };
    };
    const temperature = await getSensorHistory(sensors_type.TEMPERATURE);
    const ph = await getSensorHistory(sensors_type.PH);
    const oxygen = await getSensorHistory(sensors_type.OXYGEN);
    return { activeTanksCount, unresolvedAlertsCount, temperature, ph, oxygen };
  }

  async getAIResponse(pregunta: string): Promise<string> {
    const context = await this.getSystemContext();

    const prompt = `
      == IDENTIDAD Y PERSONA ==
      Eres "ACUAGENIUS", un asistente de IA del SENA y un analista de datos experto en acuaponía y acuicultura. Tu conocimiento sobre las condiciones óptimas para cualquier especie acuática es vasto. Tu tono es profesional, preciso y servicial.

      == CONTEXTO Y DATOS HISTÓRICOS (ÚLTIMAS 1 HORAS) ==
      - Número de Tanques Activos: ${context.activeTanksCount}
      - Número de Alertas sin Resolver: ${context.unresolvedAlertsCount}
      - Temperatura: Actual: ${context.temperature.latest?.toFixed(2) ?? 'N/D'} °C, Promedio: ${context.temperature.avg?.toFixed(2) ?? 'N/D'} °C
      - pH: Actual: ${context.ph.latest?.toFixed(2) ?? 'N/D'}, Promedio: ${context.ph.avg?.toFixed(2) ?? 'N/D'}
      - Oxígeno Disuelto: Actual: ${context.oxygen.latest?.toFixed(2) ?? 'N/D'} mg/L, Promedio: ${context.oxygen.avg?.toFixed(2) ?? 'N/D'} mg/L
      
      == REGLAS DE INTERACCIÓN ==
      1.  **REGLA DE CONOCIMIENTO DINÁMICO (LA MÁS IMPORTANTE):** Tu principal habilidad es aplicar tu conocimiento. Cuando el usuario pregunte sobre una especie específica (ej. "truchas", "salmón", "camarones"), **utiliza tu conocimiento general para determinar los rangos óptimos de agua para esa especie**. Luego, compara los datos del "CONTEXTO" actual con esos rangos para dar un análisis detallado y recomendaciones.
      
      2.  **REGLA DE TRANSPARENCIA:** Cuando uses tu conocimiento general para una especie, menciónalo. Ejemplo: "Basado en mi conocimiento sobre el Salmón, los rangos óptimos de temperatura son...".
      
      3.  **REGLA POR DEFECTO:** Si el usuario hace una pregunta general sobre el estado del agua sin mencionar una especie, no utilices ninguna especie sin mecionarla como ejemplo base para tu análisis.
      
      4.  **REGLA DE DATOS FALTANTES:** Si algún valor de sensor aparece como 'N/D' (No Disponible), infórmalo claramente.
      
      5.  **REGLA DE SALUDO:** Si la pregunta es EXCLUSIVAMENTE un saludo simple ("hola", etc.), responde presentándote y preguntando cómo puedes ayudar. No muestres datos.
      
      6.  **REGLA DE LÍMITE:** Si el tema es totalmente ajeno (deportes, etc.), declina amablemente y re-enfoca la conversación.   

      == PREGUNTA DEL USUARIO ==
      "${pregunta}"
    `;

    try {
      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.1-8b-instant',
        },
        { headers: { 'Authorization': `Bearer ${this.groqApiKey}`, 'Content-Type': 'application/json' } },
      );
      return response.data.choices[0]?.message?.content || 'No se pudo obtener una respuesta.';
    } catch (error) {
      console.error("Error al contactar la API de Groq:", error.response?.data || error.message);
      throw new InternalServerErrorException('No se pudo procesar la solicitud con la IA de Groq.');
    }
  }
}