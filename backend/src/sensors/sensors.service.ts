/**
 * @file sensors.service.ts
 * @description Lógica de negocio para la gestión de sensores.
 * @author Kevin Mariano
 * @version 6.0.0
 * @since 1.0.0
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { FindSensorsDto } from './dto/find-sensors.dto';
import { Sensor } from '@prisma/client';

/**
 * @class SensorsService
 * @description Provee los métodos para interactuar con la tabla de sensores.
 */
@Injectable()
export class SensorsService {
  constructor(private prisma: PrismaService) {}

  /**
   * @method create
   * @description Crea un nuevo sensor, heredando la ubicación y el usuario del tanque asociado.
   * @param {CreateSensorDto} createSensorDto - Datos del sensor a crear.
   * @returns {Promise<Sensor>} El sensor recién creado.
   */
  async create(createSensorDto: CreateSensorDto): Promise<Sensor> {
    const { tankId, ...sensorData } = createSensorDto;

    const tank = await this.prisma.tank.findUnique({
      where: { id: tankId },
    });

    if (!tank) {
      throw new NotFoundException(`El tanque con ID "${tankId}" no fue encontrado.`);
    }

    return this.prisma.sensor.create({
      data: {
        ...sensorData,
        location: tank.location, // Hereda la ubicación del tanque.
        tank: {
          connect: { id: tankId },
        },
      },
    });
  }

  /**
   * @method findAll
   * @description Busca y devuelve una lista de sensores.
   * @param {FindSensorsDto} findSensorsDto - Objeto de consulta.
   * @returns {Promise<Sensor[]>} Una lista de sensores.
   */
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
  
  /**
   * @method findAllFlat
   * @description Devuelve una lista de todos los sensores sin relaciones.
   * @returns {Promise<Sensor[]>} Una lista de todos los sensores.
   */
  async findAllFlat(): Promise<Sensor[]> {
    return this.prisma.sensor.findMany();
  }

  /**
   * @method findOne
   * @description Busca un único sensor por su ID.
   * @param {string} id - El ID del sensor.
   * @throws {NotFoundException} Si no se encuentra el sensor.
   * @returns {Promise<Sensor>} El sensor encontrado.
   */
  async findOne(id: string): Promise<Sensor> {
    const sensor = await this.prisma.sensor.findUnique({ where: { id } });
    if (!sensor) {
      throw new NotFoundException(`Sensor con ID "${id}" no encontrado.`);
    }
    return sensor;
  }

  /**
   * @method update
   * @description Actualiza los datos de un sensor existente.
   * @param {string} id - El ID del sensor a actualizar.
   * @param {UpdateSensorDto} updateSensorDto - Los datos a modificar.
   * @returns {Promise<Sensor>} El sensor actualizado.
   */
  async update(id: string, updateSensorDto: UpdateSensorDto): Promise<Sensor> {
    await this.findOne(id);
    return this.prisma.sensor.update({
      where: { id },
      data: updateSensorDto,
    });
  }

  /**
   * @method remove
   * @description Elimina un sensor de la base de datos.
   * @param {string} id - El ID del sensor a eliminar.
   * @returns {Promise<Sensor>} Los datos del sensor eliminado.
   */
  async remove(id: string): Promise<Sensor> {
    await this.findOne(id);
    return this.prisma.sensor.delete({ where: { id } });
  }
}