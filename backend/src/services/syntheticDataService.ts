import { Sensor, Tank, User } from '@prisma/client';
import { mqttService } from './mqttService';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

interface ActiveEmitter {
    intervalId: NodeJS.Timeout;
    sensorId: string;
    sensorName: string;
    tankName: string;
    userName: string;
    type: Sensor['type'];
}

const activeEmitters = new Map<string, ActiveEmitter>();

const generateRealisticValue = (type: Sensor['type']) => {
    switch (type) {
        case 'TEMPERATURE': return 24 + (Math.random() * 4 - 2);
        case 'PH': return 7.0 + (Math.random() * 0.8 - 0.4);
        case 'OXYGEN': return 7.5 + (Math.random() * 3 - 1.5);
        default: return 0;
    }
};

export const startSyntheticEmitter = (sensor: Sensor & { tank: Tank & { user: User } }) => {
    if (activeEmitters.has(sensor.id)) return;

    const intervalId = setInterval(() => {
        const value = generateRealisticValue(sensor.type);
        const topic = `sena/acuaponia/sensors/${sensor.hardwareId}/${sensor.type.toLowerCase()}`;
        mqttService.publish(topic, value.toFixed(2));
    }, 5000);

    activeEmitters.set(sensor.id, {
        intervalId, sensorId: sensor.id, sensorName: sensor.name,
        tankName: sensor.tank.name, userName: sensor.tank.user.name, type: sensor.type,
    });
    logger.info(`Emisor sintético iniciado para: ${sensor.name} (ID: ${sensor.id})`);
};

export const stopSyntheticEmitter = (sensorId: string) => {
    const emitter = activeEmitters.get(sensorId);
    if (emitter) {
        clearInterval(emitter.intervalId);
        activeEmitters.delete(sensorId);
        logger.info(`Emisor sintético detenido para ID: ${sensorId}`);
    }
};

export const getActiveEmitters = () => {
    return Array.from(activeEmitters.values()).map(({ intervalId, ...rest }) => rest);
};

export const manualDataEntry = async (sensorId: string, value: number) => {
    if (typeof value !== 'number') return;
    const sensor = await prisma.sensor.findUnique({ where: { id: sensorId } });
    if (!sensor) throw new Error(`Sensor con ID ${sensorId} no encontrado.`);
    const topic = `sena/acuaponia/sensors/${sensor.hardwareId}/${sensor.type.toLowerCase()}`;
    mqttService.publish(topic, String(value));
};