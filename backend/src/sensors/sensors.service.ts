/**
 * @file sensors.service.ts
 * @description Lógica de negocio para la gestión de sensores, con validación de límite por tanque.
 * @author Kevin Mariano
 * @version 7.0.0
 * @since 1.0.0
 */
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { FindSensorsDto } from './dto/find-sensors.dto';
import { Sensor } from '@prisma/client';

const MAX_SENSORS_PER_TANK = 5;

/**
 * @class SensorsService
 * @description Provee los métodos para interactuar con la tabla de sensores,
 * incluyendo la lógica de negocio para la creación, consulta, actualización y eliminación.
 */
@Injectable()
export class SensorsService {
  /**
   * @private
   * @type {PrismaService}
   */
  constructor(private prisma: PrismaService) {}

  /**
   * @method create
   * @description Crea un nuevo sensor, heredando la ubicación del tanque y validando el límite de sensores.
   * @param {CreateSensorDto} createSensorDto - Datos del sensor a crear.
   * @returns {Promise<Sensor>} El sensor recién creado.
   * @throws {NotFoundException} Si el tanque asociado no se encuentra.
   * @throws {ConflictException} Si el tanque ya alcanzó el número máximo de sensores.
   */
  async create(createSensorDto: CreateSensorDto): Promise<Sensor> {
    const { tankId, ...sensorData } = createSensorDto;

    const tank = await this.prisma.tank.findUnique({
      where: { id: tankId },
      include: {
        _count: {
          select: { sensors: true },
        },
      },
    });

    if (!tank) {
      throw new NotFoundException(`El tanque con ID "${tankId}" no fue encontrado.`);
    }

    if (tank._count.sensors >= MAX_SENSORS_PER_TANK) {
      throw new ConflictException(`El tanque "${tank.name}" ya ha alcanzado el límite de ${MAX_SENSORS_PER_TANK} sensores.`);
    }

    return this.prisma.sensor.create({
      data: {
        ...sensorData,
        location: tank.location,
        tank: {
          connect: { id: tankId },
        },
      },
    });
  }

  /**
   * @method findAll
   * @description Busca y devuelve una lista de sensores, opcionalmente filtrada por tanque.
   * @param {FindSensorsDto} findSensorsDto - Objeto con los parámetros de consulta.
   * @returns {Promise<Sensor[]>} Una lista de sensores que cumplen con el filtro.
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
   * @method findOne
   * @description Busca un único sensor por su ID.
   * @param {string} id - El ID del sensor a buscar.
   * @returns {Promise<Sensor>} El sensor encontrado.
   * @throws {NotFoundException} Si no se encuentra ningún sensor con el ID proporcionado.
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
   * @returns {Promise<Sensor>} El sensor con los datos actualizados.
   */
  async update(id: string, updateSensorDto: UpdateSensorDto): Promise<Sensor> {
    await this.findOne(id); // Asegura que el sensor exista antes de intentar actualizar
    return this.prisma.sensor.update({
      where: { id },
      data: updateSensorDto,
    });
  }

  /**
   * @method remove
   * @description Elimina un sensor de la base de datos.
   * @param {string} id - El ID del sensor a eliminar.
   * @returns {Promise<Sensor>} Los datos del sensor que fue eliminado.
   */
  async remove(id: string): Promise<Sensor> {
    await this.findOne(id); // Asegura que el sensor exista
    return this.prisma.sensor.delete({ where: { id } });
  }
}