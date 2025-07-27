import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { socketService } from './socketService';
import { emailService } from './emailService';

export interface CreateAlertInput {
  type: string;
  severity: string;
  message: string;
  sensorId: string;
  value?: number;
  threshold?: number;
}

export interface ThresholdConfig {
  temperature: {
    min: number;
    max: number;
    critical_min: number;
    critical_max: number;
  };
  ph: {
    min: number;
    max: number;
    critical_min: number;
    critical_max: number;
  };
  oxygen: {
    min: number;
    max: number;
    critical_min: number;
    critical_max: number;
  };
}

class AlertService {
  private defaultThresholds: ThresholdConfig = {
    temperature: {
      min: 20,
      max: 28,
      critical_min: 15,
      critical_max: 35,
    },
    ph: {
      min: 6.8,
      max: 7.6,
      critical_min: 6.0,
      critical_max: 8.5,
    },
    oxygen: {
      min: 6,
      max: 10,
      critical_min: 4,
      critical_max: 15,
    },
  };

  async createAlert(data: CreateAlertInput) {
    try {
      const alert = await prisma.alert.create({
        data: {
          type: data.type as any,
          severity: data.severity as any,
          message: data.message,
          sensorId: data.sensorId,
          value: data.value,
          threshold: data.threshold,
        },
        include: {
          sensor: {
            include: {
              tank: true,
            }
          }
        }
      });

      // Emitir alerta via Socket.IO
      socketService.emitAlert(alert);

      // Enviar email para alertas críticas
      if (alert.severity === 'CRITICAL' || alert.severity === 'HIGH') {
        await this.sendAlertEmail(alert);
      }

      logger.info(`Alerta creada: ${alert.type} - ${alert.severity}`);
      return alert;

    } catch (error) {
      logger.error('Error creando alerta:', error);
      throw error;
    }
  }

  async checkThresholds(sensorId: string, data: any) {
    try {
      const sensor = await prisma.sensor.findUnique({
        where: { id: sensorId },
        include: { tank: true }
      });

      if (!sensor) {
        logger.error(`Sensor no encontrado: ${sensorId}`);
        return;
      }

      const alerts = [];

      // Verificar temperatura
      if (data.temperature !== null && data.temperature !== undefined) {
        const tempAlerts = this.checkTemperatureThresholds(data.temperature, sensor);
        alerts.push(...tempAlerts);
      }

      // Verificar pH
      if (data.ph !== null && data.ph !== undefined) {
        const phAlerts = this.checkPhThresholds(data.ph, sensor);
        alerts.push(...phAlerts);
      }

      // Verificar oxígeno
      if (data.oxygen !== null && data.oxygen !== undefined) {
        const oxygenAlerts = this.checkOxygenThresholds(data.oxygen, sensor);
        alerts.push(...oxygenAlerts);
      }

      // Crear alertas encontradas
      for (const alertData of alerts) {
        await this.createAlert({
          ...alertData,
          sensorId: sensor.id,
        });
      }

    } catch (error) {
      logger.error('Error verificando umbrales:', error);
    }
  }

  private checkTemperatureThresholds(temperature: number, sensor: any) {
    const alerts = [];
    const thresholds = this.defaultThresholds.temperature;

    if (temperature <= thresholds.critical_min) {
      alerts.push({
        type: 'TEMPERATURE_LOW',
        severity: 'CRITICAL',
        message: `Temperatura crítica baja detectada: ${temperature}°C en ${sensor.name}`,
        value: temperature,
        threshold: thresholds.critical_min,
      });
    } else if (temperature < thresholds.min) {
      alerts.push({
        type: 'TEMPERATURE_LOW',
        severity: 'HIGH',
        message: `Temperatura baja detectada: ${temperature}°C en ${sensor.name}`,
        value: temperature,
        threshold: thresholds.min,
      });
    }

    if (temperature >= thresholds.critical_max) {
      alerts.push({
        type: 'TEMPERATURE_HIGH',
        severity: 'CRITICAL',
        message: `Temperatura crítica alta detectada: ${temperature}°C en ${sensor.name}`,
        value: temperature,
        threshold: thresholds.critical_max,
      });
    } else if (temperature > thresholds.max) {
      alerts.push({
        type: 'TEMPERATURE_HIGH',
        severity: 'HIGH',
        message: `Temperatura alta detectada: ${temperature}°C en ${sensor.name}`,
        value: temperature,
        threshold: thresholds.max,
      });
    }

    return alerts;
  }

  private checkPhThresholds(ph: number, sensor: any) {
    const alerts = [];
    const thresholds = this.defaultThresholds.ph;

    if (ph <= thresholds.critical_min) {
      alerts.push({
        type: 'PH_LOW',
        severity: 'CRITICAL',
        message: `pH crítico bajo detectado: ${ph} en ${sensor.name}`,
        value: ph,
        threshold: thresholds.critical_min,
      });
    } else if (ph < thresholds.min) {
      alerts.push({
        type: 'PH_LOW',
        severity: 'HIGH',
        message: `pH bajo detectado: ${ph} en ${sensor.name}`,
        value: ph,
        threshold: thresholds.min,
      });
    }

    if (ph >= thresholds.critical_max) {
      alerts.push({
        type: 'PH_HIGH',
        severity: 'CRITICAL',
        message: `pH crítico alto detectado: ${ph} en ${sensor.name}`,
        value: ph,
        threshold: thresholds.critical_max,
      });
    } else if (ph > thresholds.max) {
      alerts.push({
        type: 'PH_HIGH',
        severity: 'HIGH',
        message: `pH alto detectado: ${ph} en ${sensor.name}`,
        value: ph,
        threshold: thresholds.max,
      });
    }

    return alerts;
  }

  private checkOxygenThresholds(oxygen: number, sensor: any) {
    const alerts = [];
    const thresholds = this.defaultThresholds.oxygen;

    if (oxygen <= thresholds.critical_min) {
      alerts.push({
        type: 'OXYGEN_LOW',
        severity: 'CRITICAL',
        message: `Oxígeno crítico bajo detectado: ${oxygen} mg/L en ${sensor.name}`,
        value: oxygen,
        threshold: thresholds.critical_min,
      });
    } else if (oxygen < thresholds.min) {
      alerts.push({
        type: 'OXYGEN_LOW',
        severity: 'HIGH',
        message: `Oxígeno bajo detectado: ${oxygen} mg/L en ${sensor.name}`,
        value: oxygen,
        threshold: thresholds.min,
      });
    }

    if (oxygen >= thresholds.critical_max) {
      alerts.push({
        type: 'OXYGEN_HIGH',
        severity: 'CRITICAL',
        message: `Oxígeno crítico alto detectado: ${oxygen} mg/L en ${sensor.name}`,
        value: oxygen,
        threshold: thresholds.critical_max,
      });
    } else if (oxygen > thresholds.max) {
      alerts.push({
        type: 'OXYGEN_HIGH',
        severity: 'HIGH',
        message: `Oxígeno alto detectado: ${oxygen} mg/L en ${sensor.name}`,
        value: oxygen,
        threshold: thresholds.max,
      });
    }

    return alerts;
  }

  async getAlerts(query: any = {}) {
    try {
      const where: any = {};

      if (query.sensorId) {
        where.sensorId = query.sensorId;
      }

      if (query.severity) {
        where.severity = query.severity;
      }

      if (query.resolved !== undefined) {
        where.resolved = query.resolved;
      }

      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) where.createdAt.gte = query.startDate;
        if (query.endDate) where.createdAt.lte = query.endDate;
      }

      const alerts = await prisma.alert.findMany({
        where,
        include: {
          sensor: {
            include: {
              tank: true,
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0,
      });

      return alerts;

    } catch (error) {
      logger.error('Error obteniendo alertas:', error);
      throw error;
    }
  }

  async resolveAlert(alertId: string, userId?: string) {
    try {
      const alert = await prisma.alert.update({
        where: { id: alertId },
        data: {
          resolved: true,
          resolvedAt: new Date(),
          userId: userId,
        },
        include: {
          sensor: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          }
        }
      });

      logger.info(`Alerta resuelta: ${alertId} por usuario ${userId}`);
      return alert;

    } catch (error) {
      logger.error('Error resolviendo alerta:', error);
      throw error;
    }
  }

  private async sendAlertEmail(alert: any) {
    try {
      // Obtener administradores para notificar
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          status: 'ACTIVE',
        },
        select: {
          email: true,
          name: true,
        }
      });

      const emailData = {
        subject: `🚨 Alerta ${alert.severity}: ${alert.type}`,
        html: `
          <h2>Alerta del Sistema de Monitoreo Acuático SENA</h2>
          <p><strong>Tipo:</strong> ${alert.type}</p>
          <p><strong>Severidad:</strong> ${alert.severity}</p>
          <p><strong>Mensaje:</strong> ${alert.message}</p>
          <p><strong>Sensor:</strong> ${alert.sensor.name}</p>
          <p><strong>Ubicación:</strong> ${alert.sensor.tank.name} - ${alert.sensor.tank.location}</p>
          <p><strong>Fecha:</strong> ${new Date(alert.createdAt).toLocaleString('es-ES')}</p>
          ${alert.value ? `<p><strong>Valor:</strong> ${alert.value}</p>` : ''}
          ${alert.threshold ? `<p><strong>Umbral:</strong> ${alert.threshold}</p>` : ''}
          <hr>
          <p><small>Sistema de Monitoreo Acuático - SENA</small></p>
        `,
      };

      for (const admin of admins) {
        await emailService.sendEmail(admin.email, emailData.subject, emailData.html);
      }

    } catch (error) {
      logger.error('Error enviando email de alerta:', error);
    }
  }

  async getAlertStatistics(startDate?: Date, endDate?: Date) {
    try {
      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const [total, resolved, bySeverity, byType] = await Promise.all([
        prisma.alert.count({ where }),
        prisma.alert.count({ where: { ...where, resolved: true } }),
        prisma.alert.groupBy({
          by: ['severity'],
          where,
          _count: { severity: true },
        }),
        prisma.alert.groupBy({
          by: ['type'],
          where,
          _count: { type: true },
        }),
      ]);

      return {
        total,
        resolved,
        pending: total - resolved,
        bySeverity: bySeverity.reduce((acc, item) => {
          acc[item.severity] = item._count.severity;
          return acc;
        }, {} as Record<string, number>),
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        }, {} as Record<string, number>),
      };

    } catch (error) {
      logger.error('Error obteniendo estadísticas de alertas:', error);
      throw error;
    }
  }
}

export const alertService = new AlertService();
export default alertService;