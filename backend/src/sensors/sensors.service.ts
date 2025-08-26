/**
 * @file sensors.service.ts
 * @description Lógica de negocio para la gestión de sensores, con validación de límite por tipo de sensor por tanque.
 * @author Kevin Mariano
 * @version 1.0.0
 * @since 1.0.0
 */
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { FindSensorsDto } from './dto/find-sensors.dto';
import { Sensor, SensorType } from '@prisma/client';

const MAX_SENSORS_PER_TYPE_PER_TANK = 1;

/**
 * @class SensorsService
 * @description Provee los métodos para interactuar con la tabla de sensores,
 * incluyendo la lógica de negocio para la creación, consulta, actualización y eliminación.
 * Implementa validaciones por tipo de sensor por tanque (máximo 1 por tipo).
 */
@Injectable()
export class SensorsService {
  constructor(private prisma: PrismaService) {}

  /**
   * @method create
   * @description Crea un nuevo sensor, heredando la ubicación del tanque y validando el límite de sensores por tipo.
   * @param {CreateSensorDto} createSensorDto - Datos del sensor a crear.
   * @returns {Promise<Sensor>} El sensor recién creado.
   * @throws {NotFoundException} Si el tanque asociado no se encuentra.
   * @throws {ConflictException} Si el tanque ya tiene un sensor del tipo especificado.
   */
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

    if (tank.sensors.length >= MAX_SENSORS_PER_TYPE_PER_TANK) {
      throw new ConflictException(
        `El tanque "${tank.name}" ya tiene un sensor de tipo ${type}.`
      );
    }

    const existingHardwareSensor = await this.prisma.sensor.findUnique({
      where: { hardwareId },
    });

    if (existingHardwareSensor) {
      throw new ConflictException(
        `Ya existe un sensor con el ID de hardware "${hardwareId}".`
      );
    }

    return this.prisma.sensor.create({
      data: {
        ...sensorData,
        hardwareId,
        type,
        location: tank.location,
        tank: {
          connect: { id: tankId },
        },
      },
      include: {
        tank: true,
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

  /**
   * @method findAllFlat
   * @description Obtiene todos los sensores sin filtros para uso administrativo.
   * @returns {Promise<Sensor[]>} Lista completa de sensores.
   */
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

  /**
   * @method findOne
   * @description Busca un único sensor por su ID.
   * @param {string} id - El ID del sensor a buscar.
   * @returns {Promise<Sensor>} El sensor encontrado con información completa.
   * @throws {NotFoundException} Si no se encuentra ningún sensor con el ID proporcionado.
   */
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
            SensorData: true,
          },
        },
      },
    });

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
    const sensor = await this.findOne(id);

    return this.prisma.sensor.update({
      where: { id },
      data: updateSensorDto,
      include: {
        tank: true,
      },
    });
  }

  /**
   * @method remove
   * @description Elimina un sensor de la base de datos.
   * @param {string} id - El ID del sensor a eliminar.
   * @returns {Promise<Sensor>} Los datos del sensor que fue eliminado.
   */
  async remove(id: string): Promise<Sensor> {
    await this.findOne(id);
    
    return this.prisma.sensor.delete({
      where: { id },
      include: {
        tank: true,
      },
    });
  }

  /**
   * @method getAvailableTanksForSensorType
   * @description Obtiene los tanques que pueden recibir un sensor del tipo especificado.
   * @param {SensorType} sensorType - El tipo de sensor.
   * @param {string} userId - ID del usuario (para filtrar sus tanques).
   * @param {string} [excludeSensorId] - ID del sensor a excluir (para edición).
   * @returns {Promise<Tank[]>} Lista de tanques disponibles.
   */
  async getAvailableTanksForSensorType(
    sensorType: SensorType,
    userId: string,
    excludeSensorId?: string
  ) {
    const tanks = await this.prisma.tank.findMany({
      where: { userId },
      include: {
        sensors: {
          where: {
            type: sensorType,
            id: excludeSensorId ? { not: excludeSensorId } : undefined,
          },
        },
      },
    });

    return tanks.filter(tank => tank.sensors.length < MAX_SENSORS_PER_TYPE_PER_TANK);
  }

  /**
   * @method getSensorCountByTypeForTank
   * @description Obtiene el conteo de sensores por tipo para un tanque específico.
   * @param {string} tankId - ID del tanque.
   * @returns {Promise<Record<SensorType, number>>} Conteo por tipo de sensor.
   */
  async getSensorCountByTypeForTank(tankId: string): Promise<Record<SensorType, number>> {
    const sensors = await this.prisma.sensor.findMany({
      where: { tankId },
      select: { type: true },
    });

    const counts = {
      TEMPERATURE: 0,
      PH: 0,
      OXYGEN: 0,
    } as Record<SensorType, number>;

    sensors.forEach(sensor => {
      if (counts.hasOwnProperty(sensor.type)) {
        counts[sensor.type]++;
      }
    });

    return counts;
  }
}