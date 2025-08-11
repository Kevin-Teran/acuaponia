import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { User, SensorType } from '@prisma/client';

/**
 * @description Umbrales por defecto si el usuario no ha configurado los suyos.
 */
const DEFAULT_THRESHOLDS = {
    temperature: { min: 22, max: 28 },
    ph: { min: 6.5, high: 7.5 },
    oxygen: { min: 5, high: 9 },
};

/**
 * @class SensorsService
 * @description Contiene la lógica de negocio para la gestión de sensores.
 */
@Injectable()
export class SensorsService {
  constructor(private prisma: PrismaService) {}

  /**
   * @description Crea un nuevo sensor, validando permisos y reglas de negocio.
   * @param createSensorDto Datos para crear el sensor.
   * @param user Usuario autenticado que realiza la acción.
   */
  async create(createSensorDto: CreateSensorDto, user: User) {
    const tank = await this.prisma.tank.findUnique({ where: { id: createSensorDto.tankId } });
    if (!tank) throw new NotFoundException('El tanque especificado no existe.');
    
    if (user.role !== 'ADMIN' && tank.userId !== user.id) {
      throw new ForbiddenException('No tienes permisos para añadir sensores a este tanque.');
    }

    const existingSensorType = await this.prisma.sensor.findFirst({
        where: { tankId: createSensorDto.tankId, type: createSensorDto.type }
    });
    if (existingSensorType) throw new ConflictException(`El tanque ya tiene un sensor de tipo '${createSensorDto.type}'.`);
    
    return this.prisma.sensor.create({
      data: {
        ...createSensorDto,
        calibrationDate: new Date(createSensorDto.calibrationDate),
        location: tank.location,
      }
    });
  }

  /**
   * @description Obtiene todos los sensores de un usuario, enriqueciendo los datos con la última lectura y estado.
   * @param currentUser Usuario que realiza la petición.
   * @param targetUserId ID del usuario (opcional, para administradores) cuyos sensores se quieren ver.
   */
  async findAllForUser(currentUser: User, targetUserId?: string) {
    const userIdToQuery = (currentUser.role === 'ADMIN' && targetUserId) ? targetUserId : currentUser.id;

    const userWithSettings = await this.prisma.user.findUnique({
        where: { id: userIdToQuery },
        select: { settings: true }
    });
    
    const userThresholds = (userWithSettings?.settings as any)?.thresholds || DEFAULT_THRESHOLDS;
    
    const sensors = await this.prisma.sensor.findMany({ 
        where: { tank: { userId: userIdToQuery } }, 
        include: { tank: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
    });
    
    return Promise.all(sensors.map(async (sensor) => {
        const lastTwoReadings = await this.prisma.sensorData.findMany({
            where: { sensorId: sensor.id },
            orderBy: { timestamp: 'desc' },
            take: 2
        });

        const lastReading = lastTwoReadings[0]?.value ?? null;
        const previousReading = lastTwoReadings[1]?.value ?? null;
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (lastReading !== null && previousReading !== null) {
            if (lastReading > previousReading) trend = 'up';
            else if (lastReading < previousReading) trend = 'down';
        }

        let readingStatus: 'Óptimo' | 'Bajo' | 'Alto' = 'Óptimo';
        if (lastReading !== null) {
            const thresholds = userThresholds[sensor.type.toLowerCase() as keyof typeof userThresholds];
            if (thresholds) {
                if (lastReading < thresholds.min) readingStatus = 'Bajo';
                else if (lastReading > (thresholds.max || thresholds.high)) readingStatus = 'Alto';
            }
        }
        
        return {
            ...sensor,
            lastReading,
            trend,
            readingStatus
        };
    }));
  }

  /**
   * @description Busca un sensor por su ID, validando permisos.
   * @param id ID del sensor a buscar.
   * @param user Usuario autenticado.
   */
  async findOne(id: string, user: User) {
    const sensor = await this.prisma.sensor.findUnique({ where: { id }, include: { tank: true } });
    if (!sensor) throw new NotFoundException('Sensor no encontrado.');
    if (user.role !== 'ADMIN' && sensor.tank.userId !== user.id) throw new ForbiddenException('No tienes permiso para acceder a este sensor.');
    return sensor;
  }
  
  /**
   * @description Actualiza los datos de un sensor.
   * @param id ID del sensor a actualizar.
   * @param updateSensorDto Datos a actualizar.
   * @param user Usuario autenticado.
   */
  async update(id: string, updateSensorDto: UpdateSensorDto, user: User) {
    const sensor = await this.findOne(id, user);

    if (updateSensorDto.name && updateSensorDto.name !== sensor.name) {
        const existingSensor = await this.prisma.sensor.findFirst({
            where: { name: updateSensorDto.name, tankId: sensor.tankId, NOT: { id } }
        });
        if (existingSensor) {
            throw new ConflictException(`Ya existe un sensor con el nombre '${updateSensorDto.name}' en este tanque.`);
        }
    }

    if (updateSensorDto.calibrationDate) {
        (updateSensorDto as any).calibrationDate = new Date(updateSensorDto.calibrationDate);
    }
    return this.prisma.sensor.update({ where: { id }, data: updateSensorDto });
  }

  /**
   * @description Elimina un sensor.
   * @param id ID del sensor a eliminar.
   * @param user Usuario autenticado.
   */
  async remove(id: string, user: User) {
    await this.findOne(id, user);
    return this.prisma.sensor.delete({ where: { id } });
  }
}