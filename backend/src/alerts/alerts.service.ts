/**
 * @file alerts.service.ts
 * @route backend/src/alerts
 * @description 
 * @author kevin mariano
 * @version 1.2.1 // Versión actualizada
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { EventsGateway } from '../events/events.gateway';
import { Sensor, AlertType, AlertSeverity, sensors_type, SystemConfig, User, Prisma, Alert, Role } from '@prisma/client'; // Importar Role

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Verifica si un usuario tiene activadas las notificaciones por email.
   * @param user - El objeto de usuario (con 'settings' incluidos).
   * @returns true si el usuario debe recibir correos, false en caso contrario.
   */
  private userWantsEmail(user: User): boolean {
    if (!user.settings) return true; 
    try {
      const settings = JSON.parse(user.settings);
      return settings.notifications?.email !== false; 
    } catch (e) {
      this.logger.warn(`Error parseando settings for user ${user.id}, defaulting to send email.`);
      return true; 
    }
  }

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
   * Obtiene los umbrales para un tipo de sensor específico.
   * Prioriza los settings del usuario y usa SystemConfig como respaldo.
   */
   private getThresholdsForSensor(
    sensorType: sensors_type, 
    configs: SystemConfig[],
    userThresholds?: any 
  ): { high: number | null; low: number | null } {
    
    const findSystemValue = (key: string) => {
      const config = configs.find(c => c.key === key);
      return config ? parseFloat(config.value) : null;
    };

    const userHigh = userThresholds?.[sensorType.toLowerCase()]?.max;
    const userLow = userThresholds?.[sensorType.toLowerCase()]?.min;

    switch (sensorType) {
      case 'TEMPERATURE':
        return { 
          high: userHigh ?? findSystemValue('maxTemperature'), 
          low: userLow ?? findSystemValue('minTemperature')  
        };
      case 'PH':
        return { 
          high: userHigh ?? findSystemValue('maxPh'), 
          low: userLow ?? findSystemValue('minPh') 
        };
      case 'OXYGEN':
        return { 
          high: userHigh ?? findSystemValue('maxOxygen'), 
          low: userLow ?? findSystemValue('minOxygen') 
        };
      default:
        return { high: null, low: null };
    }
  }

  async checkThresholds(
    sensor: Sensor & { tank: { name: string, user: User } }, 
    value: number
  ) {
    let userSettings: any = {};
    if (sensor.tank.user && sensor.tank.user.settings) {
      try {
        userSettings = JSON.parse(sensor.tank.user.settings);
      } catch (e) {
        this.logger.warn(`Error parseando settings para tanque ${sensor.tank.name}`);
      }
    }

    const systemConfigs = await this.prisma.systemConfig.findMany();
    
    const { high: highThreshold, low: lowThreshold } = this.getThresholdsForSensor(
      sensor.type, 
      systemConfigs, 
      userSettings.thresholds 
    );
    
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
      }, sensor.tank.user );
    }
  }

  private async createAlert(
    data: {
      sensorId: string;
      type: AlertType;
      severity: AlertSeverity;
      message: string;
      value: number;
      threshold: number;
    },
    affectedUser: User 
  ) {
    const newAlert = await this.prisma.alert.create({ 
      data,
      include: { sensor: { include: { tank: true } } }
    });

    const admins = await this.prisma.user.findMany({ where: { role: Role.ADMIN } }); // Usar Role.ADMIN
    const recipients = new Map<string, User>();

    for (const admin of admins) {
      if (this.userWantsEmail(admin)) {
        recipients.set(admin.email, admin);
      }
    }

    if (this.userWantsEmail(affectedUser)) {
      recipients.set(affectedUser.email, affectedUser);
    }

    const adminIds = admins.map(admin => admin.id);
    this.eventsGateway.broadcastNewAlertToAdmins(adminIds, newAlert);

    if (recipients.size === 0) {
      this.logger.warn(`Alerta ${newAlert.id} creada, pero no se encontraron destinatarios con notificaciones de email activadas.`);
      return;
    }

    this.logger.log(`Enviando notificaciones de alerta ${newAlert.id} a: [${Array.from(recipients.keys()).join(', ')}]`);

    for (const user of recipients.values()) {
      try {
        await this.emailService.sendAlertEmail(user, newAlert);
      } catch (error) {
        this.logger.error(`Error al enviar correo de alerta a ${user.email}:`, error);
      }
    }
  }
  
  /**
   * Obtiene las alertas no resueltas para un usuario específico.
   * Si el usuario es ADMIN, devuelve todas las alertas no resueltas.
   * @param userId - ID del usuario.
   * @returns Un array de alertas.
   */
  async getUnresolvedAlerts(userId: string): Promise<Alert[]> {
    this.logger.log(`Obteniendo alertas no resueltas para el usuario: ${userId}`);
    
    // Obtenemos el rol del usuario
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    
    // Si el usuario no existe (debería estar cubierto por el AuthGuard, pero por seguridad)
    if (!user) {
        return [];
    }

    const where: Prisma.AlertWhereInput = {
      resolved: false,
    };
    
    // APLICACIÓN DEL FILTRO:
    // Si NO es administrador (es decir, es Role.USER), filtramos por los tanques del usuario.
    if (user.role !== Role.ADMIN) {
        // Se asegura que la alerta esté ligada a un sensor, y que el tanque de ese sensor sea del usuario.
        where.sensor = {
            tank: {
                userId: userId,
            },
        };
    }
    // Si es ADMIN, la cláusula 'where.sensor' se omite, devolviendo TODAS las alertas no resueltas (resolved: false).

    return this.prisma.alert.findMany({
      where: where,
      orderBy: { createdAt: 'desc' },
      include: { sensor: { include: { tank: true } } },
      take: 50,
    });
  }

  /**
   * Marca una alerta como resuelta.
   * @param alertId - ID de la alerta a resolver.
   * @returns La alerta actualizada.
   */
  async resolveAlert(alertId: string, resolvedByUserId: string): Promise<Alert> {
    this.logger.log(`Resolviendo alerta ${alertId} por el usuario ${resolvedByUserId}`);
    return this.prisma.alert.update({
      where: { id: alertId, resolved: false },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });
  }

  /**
   * Marca automáticamente como resueltas las alertas antiguas no resueltas.
   * Utiliza el campo createdAt para determinar la antigüedad.
   * @param daysOld - Número de días tras los cuales una alerta se considera "antigua".
   * @returns El conteo de alertas actualizadas.
   */
  async resolveOldAlerts(daysOld: number): Promise<number> {
    const cutoffDate = new Date();
    // Restar el número de días para obtener la fecha de corte
    cutoffDate.setDate(cutoffDate.getDate() - daysOld); 

    this.logger.log(`Intentando resolver alertas no resueltas creadas antes de: ${cutoffDate.toISOString()}`);

    const result = await this.prisma.alert.updateMany({
      where: {
        resolved: false,
        createdAt: {
          lt: cutoffDate, // Filtra por alertas cuya fecha de creación es 'Less Than' (anterior a) la fecha de corte
        },
      },
      data: {
        resolved: true,
        resolvedAt: new Date(),
      },
    });

    this.logger.log(`Resolución automática completada: ${result.count} alertas marcadas como resueltas.`);
    return result.count;
  }
}