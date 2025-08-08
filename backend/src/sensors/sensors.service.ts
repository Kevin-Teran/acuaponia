import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { User, SensorType } from '@prisma/client';

// Umbrales para determinar el estado de un sensor
const SENSOR_THRESHOLDS = {
    TEMPERATURE: { low: 22, high: 28 },
    PH: { low: 6.5, high: 7.5 },
    OXYGEN: { low: 5, high: 9 },
};

@Injectable()
export class SensorsService {
  constructor(private prisma: PrismaService) {}

  async create(createSensorDto: CreateSensorDto, user: User) {
    const tank = await this.prisma.tank.findUnique({ where: { id: createSensorDto.tankId } });
    if (!tank) throw new NotFoundException('El tanque especificado no existe.');
    if (user.role !== 'ADMIN' && tank.userId !== user.id) throw new ForbiddenException('No tienes permisos para añadir sensores a este tanque.');

    const existingSensorType = await this.prisma.sensor.findFirst({
        where: { tankId: createSensorDto.tankId, type: createSensorDto.type }
    });
    if (existingSensorType) throw new ConflictException(`El tanque ya tiene un sensor de tipo '${createSensorDto.type}'.`);
    
    const { tankId, ...sensorData } = createSensorDto;
    return this.prisma.sensor.create({
      data: {
        ...sensorData,
        calibrationDate: new Date(createSensorDto.calibrationDate),
        location: tank.location,
        tank: { connect: { id: tankId } }
      }
    });
  }

  async findAllForUser(currentUser: User, targetUserId?: string) {
    let userIdToQuery: string;
    if (currentUser.role === 'ADMIN' && targetUserId) {
      userIdToQuery = targetUserId;
    } else {
      userIdToQuery = currentUser.id;
    }
    
    const sensors = await this.prisma.sensor.findMany({ 
        where: { tank: { userId: userIdToQuery } }, 
        include: { tank: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
    });
    
    // Lógica para enriquecer los datos con lecturas, estado y tendencia
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
            const thresholds = SENSOR_THRESHOLDS[sensor.type as SensorType];
            if (thresholds) {
                if (lastReading < thresholds.low) readingStatus = 'Bajo';
                else if (lastReading > thresholds.high) readingStatus = 'Alto';
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

  async findOne(id: string, user: User) {
    const sensor = await this.prisma.sensor.findUnique({ where: { id }, include: { tank: true } });
    if (!sensor) throw new NotFoundException('Sensor no encontrado.');
    if (user.role !== 'ADMIN' && sensor.tank.userId !== user.id) throw new ForbiddenException('No tienes permiso para acceder a este sensor.');
    return sensor;
  }
  
  async update(id: string, updateSensorDto: UpdateSensorDto, user: User) {
    await this.findOne(id, user);
    if (updateSensorDto.calibrationDate) {
        (updateSensorDto as any).calibrationDate = new Date(updateSensorDto.calibrationDate);
    }
    return this.prisma.sensor.update({ where: { id }, data: updateSensorDto });
  }

  async remove(id: string, user: User) {
    await this.findOne(id, user);
    return this.prisma.sensor.delete({ where: { id } });
  }
}