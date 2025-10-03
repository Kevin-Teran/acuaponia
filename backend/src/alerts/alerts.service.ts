/**
 * @file alerts.service.ts
 * @route backend/src/alerts
 * @description 
 * @author kevin mariano
 * @version 1.0.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EventsGateway } from '../events/events.gateway';
import { Sensor, AlertType, AlertSeverity, sensors_type, SystemConfig } from '@prisma/client';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  private getAlertTypeAndSeverity(sensorType: sensors_type, isHigh: boolean): { type: AlertType; severity: AlertSeverity } {
    const typeMapping: Partial<Record<sensors_type, { high: AlertType; low: AlertType }>> = {
      TEMPERATURE: { high: 'TEMPERATURE_HIGH', low: 'TEMPERATURE_LOW' },
      PH: { high: 'PH_HIGH', low: 'PH_LOW' },
      OXYGEN: { high: 'OXYGEN_HIGH', low: 'OXYGEN_LOW' },
    };

    const type = typeMapping[sensorType] ? (isHigh ? typeMapping[sensorType].high : typeMapping[sensorType].low) : 'SYSTEM_ERROR';

    let severity: AlertSeverity = 'MEDIUM';
    if (sensorType === 'OXYGEN' && !isHigh) severity = 'CRITICAL';
    if (sensorType === 'PH') severity = 'HIGH';

    return { type, severity };
  }

  /**
   * Obtiene los umbrales para un tipo de sensor específico desde la tabla SystemConfig.
   * @param sensorType - El tipo de sensor (TEMPERATURE, PH, etc.).
   * @param configs - Un array con todas las configuraciones del sistema.
   * @returns Un objeto con los umbrales alto y bajo.
   */
  private getThresholdsForSensor(sensorType: sensors_type, configs: SystemConfig[]): { high: number | null; low: number | null } {
    const findValue = (key: string) => {
      const config = configs.find(c => c.key === key);
      return config ? parseFloat(config.value) : null;
    };

    switch (sensorType) {
      case 'TEMPERATURE':
        return { high: findValue('maxTemperature'), low: findValue('minTemperature') };
      case 'PH':
        return { high: findValue('maxPh'), low: findValue('minPh') };
      case 'OXYGEN':
        return { high: findValue('maxOxygen'), low: findValue('minOxygen') };
      default:
        return { high: null, low: null };
    }
  }

  async checkThresholds(sensor: Sensor & { tank: { name: string } }, value: number) {
    const systemConfigs = await this.prisma.systemConfig.findMany();
    if (systemConfigs.length === 0) {
      this.logger.warn('No se encontraron configuraciones (SystemConfig) en la base de datos. No se pueden verificar los umbrales.');
      return;
    }

    const { high: highThreshold, low: lowThreshold } = this.getThresholdsForSensor(sensor.type, systemConfigs);
    
    let thresholdExceeded: 'high' | 'low' | null = null;
    let threshold: number | null = null;

    if (highThreshold !== null && value > highThreshold) {
      thresholdExceeded = 'high';
      threshold = highThreshold;
    } else if (lowThreshold !== null && value < lowThreshold) {
      thresholdExceeded = 'low';
      threshold = lowThreshold;
    }

    if (thresholdExceeded && threshold !== null) {
      const { type, severity } = this.getAlertTypeAndSeverity(sensor.type, thresholdExceeded === 'high');
      
      const message = `Alerta ${severity}: El sensor '${sensor.name}' del tanque '${sensor.tank.name}' registró un valor de ${value.toFixed(2)}, superando el umbral de ${threshold}.`;

      await this.createAlert({
        sensorId: sensor.id,
        type,
        severity,
        message,
        value,
        threshold,
      });
    }
  }

  private async createAlert(data: {
    sensorId: string;
    type: AlertType;
    severity: AlertSeverity;
    message: string;
    value: number;
    threshold: number;
  }) {
    const newAlert = await this.prisma.alert.create({ 
      data,
      include: { sensor: { include: { tank: true } } }
    });

    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN' } });
    if (admins.length === 0) return;

    const adminIds = admins.map(admin => admin.id);
    this.eventsGateway.broadcastNewAlertToAdmins(adminIds, newAlert);

    for (const admin of admins) {
      try {
        await this.emailService.sendAlertEmail(admin, newAlert);
      } catch (error) {
        this.logger.error(`Error al enviar correo de alerta a ${admin.email}:`, error);
      }
    }
  }
}