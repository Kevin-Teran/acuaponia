import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';
import { User, Role } from '@prisma/client';

@Injectable()
export class TanksService {
  constructor(private prisma: PrismaService) {}

  async create(createTankDto: CreateTankDto, user: User) { // <-- CORRECCIÓN: Requiere el usuario
    return this.prisma.tank.create({
      data: {
        ...createTankDto,
        userId: user.id,
      },
    });
  }

  async findAllForUser(currentUser: User, targetUserId?: string) { // <-- CORRECCIÓN: Nombre y lógica
    if (currentUser.role !== Role.ADMIN && targetUserId && currentUser.id !== targetUserId) {
      throw new ForbiddenException('No tienes permiso para ver los tanques de otros usuarios.');
    }
    const userIdToQuery = (currentUser.role === Role.ADMIN && targetUserId) ? targetUserId : currentUser.id;
    return this.prisma.tank.findMany({ where: { userId: userIdToQuery } });
  }

  async findOne(id: string, user: User) { // <-- CORRECCIÓN: Requiere el usuario
    const tank = await this.prisma.tank.findUnique({ where: { id } });
    if (!tank) {
      throw new NotFoundException(`Tanque con ID "${id}" no encontrado.`);
    }
    if (user.role !== Role.ADMIN && tank.userId !== user.id) {
      throw new ForbiddenException('No tienes permiso para acceder a este tanque.');
    }
    return tank;
  }

  async update(id: string, updateTankDto: UpdateTankDto, user: User) { // <-- CORRECCIÓN: Requiere el usuario
    await this.findOne(id, user); // Reutiliza la lógica de permisos
    return this.prisma.tank.update({
      where: { id },
      data: updateTankDto,
    });
  }

  async remove(id: string, user: User) { // <-- CORRECCIÓN: Requiere el usuario
    await this.findOne(id, user); // Reutiliza la lógica de permisos
    return this.prisma.tank.delete({ where: { id } });
  }
}