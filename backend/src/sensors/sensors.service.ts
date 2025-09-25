/**
 * @file sensors.service.ts
 * @route backend/src/sensors
 * @description Lógica de negocio para la gestión de sensores, con validación de límite por tipo de sensor por tanque.
 * @author Kevin Mariano 
 * @version 2.1.0
 * @since 1.0.0
 * @copyright SENA 2025
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { FindSensorsDto } from './dto/find-sensors.dto';
import { Sensor, sensors_type as sensors_type, Prisma } from '@prisma/client';

const MAX_SENSORS_PER_TYPE_PER_TANK = 1;

@Injectable()
export class SensorsService {
  constructor(private prisma: PrismaService) {}

  async create(createSensorDto: CreateSensorDto): Promise<Sensor> {
    const { tankId, type, hardwareId, ...sensorData } = createSensorDto;
  
    const tank = await this.prisma.tank.findUnique({
      where: { id: tankId },
      include: {
        sensors: {
          where: { type },
        },
      },
    });
  
    if (!tank) {
      throw new NotFoundException(`El tanque con ID "${tankId}" no fue encontrado.`);
    }
  
    const tankWithSensors = tank as Prisma.TankGetPayload<{
      include: { sensors: { where: { type: sensors_type } } };
    }>;
  
    if (tankWithSensors.sensors.length >= MAX_SENSORS_PER_TYPE_PER_TANK) {
      throw new ConflictException(
        `El tanque "${tankWithSensors.name}" ya tiene un sensor de tipo ${type}.`,
      );
    }
  
    const existingHardwareSensor = await this.prisma.sensor.findUnique({
      where: { hardwareId },
    });
  
    if (existingHardwareSensor) {
      throw new ConflictException(
        `Ya existe un sensor con el ID de hardware "${hardwareId}".`,
      );
    }
  
    return this.prisma.sensor.create({
      data: {
        ...sensorData,
        hardwareId,
        type,
        location: tankWithSensors.location,
        tank: {
          connect: { id: tankId },
        },
      },
      include: {
        tank: true,
      },
    });
  }

  async findAll(findSensorsDto: FindSensorsDto): Promise<Sensor[]> {
    const { tankId, userId } = findSensorsDto;
    
    return this.prisma.sensor.findMany({
      where: {
        tankId: tankId ? tankId : undefined,
        tank: userId ? { userId } : undefined,
      },
      include: {
        tank: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { tank: { name: 'asc' } },
        { type: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findAllFlat(): Promise<Sensor[]> {
    return this.prisma.sensor.findMany({
      include: {
        tank: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { tank: { user: { name: 'asc' } } },
        { tank: { name: 'asc' } },
        { type: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string): Promise<Sensor> {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id },
      include: {
        tank: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            sensorData: true,
          },
        },
      },
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor con ID "${id}" no encontrado.`);
    }

    return sensor;
  }

  async update(id: string, updateSensorDto: UpdateSensorDto): Promise<Sensor> {
    const sensorToUpdate = await this.findOne(id);

    if (updateSensorDto.tankId && updateSensorDto.tankId !== sensorToUpdate.tankId) {
      const newTank = await this.prisma.tank.findUnique({
        where: { id: updateSensorDto.tankId },
        include: { sensors: { where: { type: sensorToUpdate.type } } },
      });

      if (!newTank) {
        throw new NotFoundException(`El nuevo tanque con ID "${updateSensorDto.tankId}" no fue encontrado.`);
      }
      
      const newTankWithSensors = newTank as Prisma.TankGetPayload<{
        include: { sensors: { where: { type: sensors_type } } };
      }>;

      if (newTankWithSensors.sensors.length >= MAX_SENSORS_PER_TYPE_PER_TANK) {
        throw new ConflictException(`El tanque "${newTankWithSensors.name}" ya tiene un sensor de tipo ${sensorToUpdate.type}.`);
      }
    }

    return this.prisma.sensor.update({
      where: { id },
      data: updateSensorDto,
      include: {
        tank: true,
      },
    });
  }

  async remove(id: string): Promise<Sensor> {
    await this.findOne(id);
    
    return this.prisma.sensor.delete({
      where: { id },
      include: {
        tank: true,
      },
    });
  }

  async getAvailableTanksForSensorType(
    sensorType: sensors_type,
    userId: string,
    excludeSensorId?: string,
  ) {
    const tanks = await this.prisma.tank.findMany({
      where: { userId },
      include: {
        sensors: {
          where: {
            type: sensorType as unknown as sensors_type,
            id: excludeSensorId ? { not: excludeSensorId } : undefined,
          },
        },
      },
    });
  
    return tanks.filter(tank => tank.sensors.length < MAX_SENSORS_PER_TYPE_PER_TANK);
  }
  

  async getSensorCountByTypeForTank(tankId: string): Promise<Record<sensors_type, number>> {
    const sensors = await this.prisma.sensor.findMany({
      where: { tankId },
      select: { type: true },
    });

    const counts = {
      TEMPERATURE: 0,
      PH: 0,
      OXYGEN: 0,
    } as Record<sensors_type, number>;

    sensors.forEach(sensor => {
      if (counts.hasOwnProperty(sensor.type)) {
        counts[sensor.type]++;
      }
    });

    return counts;
  }
}