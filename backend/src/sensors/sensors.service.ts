import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SensorsService {
  constructor(private prisma: PrismaService) {}

  create(createSensorDto: CreateSensorDto) {
    return this.prisma.sensor.create({ data: createSensorDto });
  }

  /**
   * @method findAll
   * @description Obtiene todos los sensores. Si se proporciona un tankId, filtra los sensores para ese tanque.
   * @param {string} [tankId] - El ID del tanque para filtrar los sensores (opcional).
   */
  findAll(tankId?: string) {
    const whereClause = tankId ? { tankId } : {};
    return this.prisma.sensor.findMany({
      where: whereClause,
      include: {
        tank: {
          select: { name: true },
        },
      },
    });
  }

  findOne(id: string) {
    return this.prisma.sensor.findUnique({
      where: { id },
      include: {
        tank: true,
        data: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });
  }

  async update(id: string, updateSensorDto: UpdateSensorDto) {
    try {
      return await this.prisma.sensor.update({
        where: { id },
        data: updateSensorDto,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Sensor with ID ${id} not found.`);
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.sensor.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException(`Sensor with ID ${id} not found.`);
      }
      throw error;
    }
  }
}