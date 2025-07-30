import { logger } from '../utils/logger';
import { mqttService } from './mqttService';
import { Sensor, Tank, User } from '@prisma/client';
import { prisma } from '../config/database';

interface EmitterInfo {
  interval: NodeJS.Timeout;
  sensor: Sensor & { tank: Tank & { user: User } };
  status: 'active' | 'paused';
}

const activeEmitters = new Map<string, EmitterInfo>();

class SyntheticDataService {
    async startEmitter(sensorId: string): Promise<boolean> {
        if (activeEmitters.has(sensorId)) return false;

        const sensor = await prisma.sensor.findUnique({
            where: { id: sensorId },
            include: { tank: { include: { user: true } } }
        });

        if (!sensor) return false;

        const interval = setInterval(() => {
            const dataPacket = this.generateDataPacket();
            const topic = `sena/acuaponia/sensors/${sensor.id}/data`;
            mqttService.publish(topic, JSON.stringify(dataPacket));
        }, 5000);

        activeEmitters.set(sensorId, { interval, sensor, status: 'active' });
        logger.info(`Emisor iniciado para sensor: ${sensor.name}`);
        return true;
    }

    stopEmitter(sensorId: string): boolean {
        const emitter = activeEmitters.get(sensorId);
        if (emitter) {
            clearInterval(emitter.interval);
            activeEmitters.delete(sensorId);
            logger.info(`Emisor detenido y eliminado para sensor: ${sensorId}`);
            return true;
        }
        return false;
    }

    pauseEmitter(sensorId: string): boolean {
        const emitter = activeEmitters.get(sensorId);
        if (emitter && emitter.status === 'active') {
            clearInterval(emitter.interval);
            emitter.status = 'paused';
            logger.info(`Emisor pausado para sensor: ${sensorId}`);
            return true;
        }
        return false;
    }

    resumeEmitter(sensorId: string): boolean {
        const emitter = activeEmitters.get(sensorId);
        if (emitter && emitter.status === 'paused') {
            const newInterval = setInterval(() => {
                const dataPacket = this.generateDataPacket();
                const topic = `sena/acuaponia/sensors/${emitter.sensor.id}/data`;
                mqttService.publish(topic, JSON.stringify(dataPacket));
            }, 5000);
            emitter.interval = newInterval;
            emitter.status = 'active';
            logger.info(`Emisor reanudado para sensor: ${sensorId}`);
            return true;
        }
        return false;
    }
    
    getActiveEmitters() {
        return Array.from(activeEmitters.values()).map(e => ({
            sensorId: e.sensor.id,
            sensorName: e.sensor.name,
            tankName: e.sensor.tank.name,
            userName: e.sensor.tank.user.name,
            status: e.status,
        }));
    }
    
    private generateDataPacket() {
        return {
            temperature: +(25 + (Math.random() - 0.5) * 2).toFixed(2),
            ph: +(7.2 + (Math.random() - 0.5) * 0.5).toFixed(2),
            oxygen: +(8 + (Math.random() - 0.5) * 1).toFixed(2),
            timestamp: new Date().toISOString(),
        };
    }
}

export const syntheticDataService = new SyntheticDataService();