import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { Prisma, Sensor } from '@prisma/client';

/**
 * Servicio para gestionar la lógica de negocio de los sensores.
 */
@Injectable()
export class SensorsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea un nuevo sensor en la base de datos.
   * @param createSensorDto - Datos para la creación del sensor.
   * @returns El sensor recién creado.
   */
  create(createSensorDto: CreateSensorDto): Promise<Sensor> {
    const sensorData: Prisma.SensorCreateInput = {
      name: createSensorDto.name,
      hardwareId: createSensorDto.hardwareId,
      type: createSensorDto.type,
      location: createSensorDto.location,
      calibrationDate: createSensorDto.calibrationDate,
      tank: {
        connect: {
          id: createSensorDto.tankId,
        },
      },
    };

    return this.prisma.sensor.create({ data: sensorData });
  }

  /**
   * Obtiene todos los sensores, con opción de filtrar por tanque.
   * @param tankId - (Opcional) ID del tanque para filtrar los sensores.
   * @returns Un arreglo de sensores.
   */
  findAll(tankId?: string): Promise<Sensor[]> {
    const whereClause: Prisma.SensorWhereInput = tankId ? { tankId } : {};
    return this.prisma.sensor.findMany({
      where: whereClause,
      include: {
        tank: {
          select: { name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Busca un sensor específico por su ID.
   * @param id - ID del sensor a buscar.
   * @returns El sensor encontrado o lanza una excepción si no existe.
   */
  async findOne(id: string): Promise<Sensor | null> {
    const sensor = await this.prisma.sensor.findUnique({
      where: { id },
      include: {
        tank: true,
        sensorData: {
          orderBy: { timestamp: 'desc' },
          take: 20,
        },
      },
    });

    if (!sensor) {
      throw new NotFoundException(`Sensor con ID ${id} no encontrado.`);
    }
    return sensor;
  }

  /**
   * Actualiza los datos de un sensor existente.
   * @param id - ID del sensor a actualizar.
   * @param updateSensorDto - Datos a actualizar.
   * @returns El sensor con los datos actualizados.
   */
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

  /**
   * Elimina un sensor de la base de datos.
   * @param id - ID del sensor a eliminar.
   * @returns El sensor que fue eliminado.
   */
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