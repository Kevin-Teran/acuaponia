/**
 * @file sensors.service.ts
 * @description Servicio para gestionar la lógica de negocio de los sensores.
 * @author kevin mariano
 * @version 2.0.0
 * @since 1.0.0
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { Prisma, Sensor } from '@prisma/client';

@Injectable()
export class SensorsService {
  constructor(private prisma: PrismaService) {}

  create(createSensorDto: CreateSensorDto): Promise<Sensor> {
    const sensorData: Prisma.SensorCreateInput = {
      name: createSensorDto.name,
      hardwareId: createSensorDto.hardwareId,
      type: createSensorDto.type,
      location: createSensorDto.location,
      calibrationDate: createSensorDto.calibrationDate,
      tank: { connect: { id: createSensorDto.tankId } },
    };
    return this.prisma.sensor.create({ data: sensorData });
  }

  findAll(tankId?: string): Promise<Sensor[]> {
    const whereClause: Prisma.SensorWhereInput = tankId ? { tankId } : {};
    return this.prisma.sensor.findMany({
      where: whereClause,
      include: { tank: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Sensor | null> {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id },
      include: { tank: true, sensorData: { orderBy: { timestamp: 'desc' }, take: 20 } },
    });
    if (!sensor) {
      throw new NotFoundException(`Sensor con ID ${id} no encontrado.`);
    }
    return sensor;
  }

  async update(id: string, updateSensorDto: UpdateSensorDto): Promise<Sensor> {
    try {
      return await this.prisma.sensor.update({
        where: { id },
        data: updateSensorDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Sensor con ID ${id} no encontrado para actualizar.`);
      }
      throw error;
    }
  }

  async remove(id: string): Promise<Sensor> {
    try {
      return await this.prisma.sensor.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Sensor con ID ${id} no encontrado para eliminar.`);
      }
      throw error;
    }
  }
}