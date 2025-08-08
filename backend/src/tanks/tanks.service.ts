import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';
import { User } from '@prisma/client';

/**
 * @class TanksService
 * @description Contiene la lógica de negocio para la gestión de tanques.
 */
@Injectable()
export class TanksService {
  constructor(private prisma: PrismaService) {}

  async create(createTankDto: CreateTankDto, user: User) {
    const userId = user.role === 'ADMIN' && createTankDto.userId ? createTankDto.userId : user.id;
    const existingTank = await this.prisma.tank.findFirst({
        where: { name: createTankDto.name, userId: userId }
    });
    if(existingTank) {
        throw new ConflictException(`El usuario ya tiene un tanque con el nombre '${createTankDto.name}'.`);
    }
    return this.prisma.tank.create({ data: { ...createTankDto, userId: userId } });
  }

  findAllForUser(currentUser: User, targetUserId?: string) {
    let userIdToQuery: string;
    if (currentUser.role === 'ADMIN' && targetUserId) {
      userIdToQuery = targetUserId;
    } else {
      userIdToQuery = currentUser.id;
    }
    return this.prisma.tank.findMany({ 
        where: { userId: userIdToQuery },
        include: { user: { select: { name: true } }, _count: { select: { sensors: true } } },
        orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: string, user: User) {
    const tank = await this.prisma.tank.findUnique({ where: { id }, include: { user: { select: { name: true } } } });
    if (!tank) throw new NotFoundException('Tanque no encontrado.');
    if (user.role !== 'ADMIN' && tank.userId !== user.id) {
      throw new ForbiddenException('No tienes permiso para acceder a este tanque.');
    }
    return tank;
  }

  async update(id: string, updateTankDto: UpdateTankDto, user: User) {
    await this.findOne(id, user); 
    return this.prisma.tank.update({ where: { id }, data: updateTankDto });
  }

  async remove(id: string, user: User) {
    await this.findOne(id, user);
    const sensorCount = await this.prisma.sensor.count({ where: { tankId: id } });
    if (sensorCount > 0) {
      throw new ConflictException('Debes eliminar los sensores de este tanque antes de poder eliminarlo.');
    }
    return this.prisma.tank.delete({ where: { id } });
  }
}