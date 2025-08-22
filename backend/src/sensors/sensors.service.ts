/**
 * @file sensors.service.ts
 * @description
 * Lógica de negocio para la gestión de sensores. Provee los métodos para
 * interactuar con la base de datos para operaciones CRUD de sensores.
 * @author Sistema de Acuaponía SENA
 * @version 2.1.0
 * @since 1.0.0
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { FindSensorsDto } from './dto/find-sensors.dto';
import { Sensor } from '@prisma/client';

@Injectable()
export class SensorsService {
  constructor(private prisma: PrismaService) {}

  async create(createSensorDto: CreateSensorDto): Promise<Sensor> {
    return this.prisma.sensor.create({
      data: createSensorDto,
    });
  }

  async findAll(findSensorsDto: FindSensorsDto): Promise<Sensor[]> {
    const { tankId } = findSensorsDto;
    return this.prisma.sensor.findMany({
      where: {
        tankId: tankId ? tankId : undefined,
      },
      include: {
        tank: true,
      },
    });
  }
  
  async findAllFlat(): Promise<Sensor[]> {
    return this.prisma.sensor.findMany();
  }

  async findOne(id: string): Promise<Sensor> {
    const sensor = await this.prisma.sensor.findUnique({ where: { id } });
    if (!sensor) {
      throw new NotFoundException(`Sensor con ID "${id}" no encontrado.`);
    }
    return sensor;
  }

  async update(id: string, updateSensorDto: UpdateSensorDto): Promise<Sensor> {
    return this.prisma.sensor.update({
      where: { id },
      data: updateSensorDto,
    });
  }

  async remove(id: string): Promise<Sensor> {
    return this.prisma.sensor.delete({ where: { id } });
  }
}