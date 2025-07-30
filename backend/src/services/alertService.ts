import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { socketService } from './socketService';
import { emailService } from './emailService';
import { Sensor, Tank } from '@prisma/client';

/**
 * @interface ThresholdConfig
 * @desc Define la estructura para los umbrales de alerta de cada tipo de sensor.
 */
export interface ThresholdConfig {
  TEMPERATURE: { min: number; max: number; critical_min: number; critical_max: number; };
  PH: { min: number; max: number; critical_min: number; critical_max: number; };
  OXYGEN: { min: number; max: number; critical_min: number; critical_max: number; };
}

/**
 * @class AlertService
 * @desc Gestiona la creación, verificación y notificación de alertas del sistema.
 */
class AlertService {
  // Umbrales por defecto. En una versión avanzada, podrían venir de la base de datos.
  private defaultThresholds: ThresholdConfig = {
    TEMPERATURE: { min: 20, max: 28, critical_min: 15, critical_max: 35 },
    PH: { min: 6.8, max: 7.6, critical_min: 6.0, critical_max: 8.5 },
    OXYGEN: { min: 6, max: 10, critical_min: 4, critical_max: 15 },
  };

  /**
   * @desc Verifica si una nueva lectura de sensor excede los umbrales definidos.
   * @param {string} sensorId - El ID del sensor que generó la lectura.
   * @param {object} data - Un objeto con el tipo de dato y su valor (ej. { temperature: 25.5 }).
   */
  async checkThresholds(sensorId: string, data: { [key: string]: number }) {
    try {
      const sensor = await prisma.sensor.findUnique({
        where: { id: sensorId },
        include: { tank: { include: { user: true } } }
      });

      if (!sensor) return;

      const dataType = Object.keys(data)[0].toUpperCase() as keyof ThresholdConfig;
      const value = data[dataType.toLowerCase()];
      
      if (!this.defaultThresholds[dataType]) return;

      const thresholds = this.defaultThresholds[dataType];
      let alertData = null;

      if (value <= thresholds.critical_min) {
        alertData = { type: `${dataType}_LOW`, severity: 'CRITICAL', threshold: thresholds.critical_min };
      } else if (value < thresholds.min) {
        alertData = { type: `${dataType}_LOW`, severity: 'HIGH', threshold: thresholds.min };
      } else if (value >= thresholds.critical_max) {
        alertData = { type: `${dataType}_HIGH`, severity: 'CRITICAL', threshold: thresholds.critical_max };
      } else if (value > thresholds.max) {
        alertData = { type: `${dataType}_HIGH`, severity: 'HIGH', threshold: thresholds.max };
      }

      if (alertData) {
        await this.createAlert({
          ...alertData,
          message: `Valor de ${dataType.toLowerCase()} (${value}) fuera de rango en el sensor '${sensor.name}'.`,
          sensorId: sensor.id,
          value,
          userId: sensor.tank.userId,
        });
      }
    } catch (error) {
      logger.error(`Error verificando umbrales para el sensor ${sensorId}:`, error);
    }
  }

  /**
   * @desc Crea un registro de alerta en la base de datos y notifica a los usuarios.
   * @param {object} data - Los datos para la nueva alerta.
   */
  async createAlert(data: { type: string; severity: string; message: string; sensorId: string; value: number; threshold: number; userId: string; }) {
    try {
      const alert = await prisma.alert.create({
        data: {
          type: data.type as any,
          severity: data.severity as any,
          message: data.message,
          sensorId: data.sensorId,
          value: data.value,
          threshold: data.threshold,
          userId: data.userId,
        },
        include: { sensor: { include: { tank: true } } }
      });

      socketService.emitAlert(alert);

      if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
        await this.sendAlertEmail(alert);
      }
      logger.info(`Alerta creada: ${alert.type} - ${alert.severity}`);
      return alert;
    } catch (error) {
      logger.error('Error creando alerta:', error);
    }
  }

  /**
   * @desc Envía un correo electrónico de notificación para alertas importantes.
   * @param {any} alert - El objeto de la alerta.
   */
  private async sendAlertEmail(alert: any) {
    try {
      const admins = await prisma.user.findMany({ where: { role: 'ADMIN', status: 'ACTIVE' } });
      for (const admin of admins) {
        if (admin.email) {
            await emailService.sendMail({
              to: admin.email,
              subject: `🚨 Alerta ${alert.severity}: ${alert.type}`,
              text: `Alerta del Sistema de Monitoreo Acuático SENA\n\n- Mensaje: ${alert.message}\n- Sensor: ${alert.sensor.name}\n- Tanque: ${alert.sensor.tank.name}`,
              html: `<h3>Alerta ${alert.severity}</h3><p>${alert.message}</p><p><b>Sensor:</b> ${alert.sensor.name}<br/><b>Tanque:</b> ${alert.sensor.tank.name}</p>`,
            });
        }
      }
    } catch (error) {
      logger.error('Error enviando email de alerta:', error);
    }
  }
}

export const alertService = new AlertService();
