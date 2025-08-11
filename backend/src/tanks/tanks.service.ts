import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';
import { User } from '@prisma/client';

/**
 * @class TanksService
 * @description Contiene toda la lógica de negocio para la gestión de tanques.
 */
@Injectable()
export class TanksService {
  constructor(private prisma: PrismaService) {}

  /**
   * @description Crea un nuevo tanque, validando permisos y unicidad del nombre.
   * @param createTankDto Datos para la creación del tanque.
   * @param user Usuario autenticado que realiza la acción.
   */
  async create(createTankDto: CreateTankDto, user: User) {
    const userIdToAssign = (user.role === 'ADMIN' && createTankDto.userId) ? createTankDto.userId : user.id;

    const existingTank = await this.prisma.tank.findFirst({
        where: { name: createTankDto.name, userId: userIdToAssign }
    });
    if(existingTank) {
        throw new ConflictException(`Ya existe un tanque con el nombre '${createTankDto.name}' para este usuario.`);
    }
    
    return this.prisma.tank.create({ data: { ...createTankDto, userId: userIdToAssign } });
  }

  /**
   * @description Obtiene todos los tanques para un usuario específico, ordenados por fecha de creación.
   * @param currentUser Usuario que realiza la petición.
   * @param targetUserId ID del usuario (opcional, para administradores) cuyos tanques se quieren ver.
   */
  findAllForUser(currentUser: User, targetUserId?: string) {
    const userIdToQuery = (currentUser.role === 'ADMIN' && targetUserId) ? targetUserId : currentUser.id;
    
    return this.prisma.tank.findMany({ 
        where: { userId: userIdToQuery },
        include: { user: { select: { name: true } }, _count: { select: { sensors: true } } },
        orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * @description Busca un único tanque por su ID, validando los permisos de acceso.
   * @param id El ID del tanque a buscar.
   * @param user El usuario autenticado.
   */
  async findOne(id: string, user: User) {
    const tank = await this.prisma.tank.findUnique({ where: { id }, include: { user: { select: { name: true } } } });
    if (!tank) throw new NotFoundException('Tanque no encontrado.');
    if (user.role !== 'ADMIN' && tank.userId !== user.id) {
      throw new ForbiddenException('No tienes permiso para acceder a este tanque.');
    }
    return tank;
  }

  /**
   * @description Actualiza los datos de un tanque, validando permisos y unicidad del nuevo nombre.
   * @param id El ID del tanque a actualizar.
   * @param updateTankDto Los datos para actualizar.
   * @param user El usuario autenticado.
   */
  async update(id: string, updateTankDto: UpdateTankDto, user: User) {
    const tank = await this.findOne(id, user); 
    
    if (updateTankDto.name && updateTankDto.name !== tank.name) {
        const existingTank = await this.prisma.tank.findFirst({
            where: { name: updateTankDto.name, userId: tank.userId, NOT: { id } }
        });
        if (existingTank) {
            throw new ConflictException(`Ya existe un tanque con el nombre '${updateTankDto.name}' para este usuario.`);
        }
    }
    
    return this.prisma.tank.update({ where: { id }, data: updateTankDto });
  }

  /**
   * @description Elimina un tanque, validando que no tenga sensores asociados.
   * @param id El ID del tanque a eliminar.
   * @param user El usuario autenticado.
   */
  async remove(id: string, user: User) {
    await this.findOne(id, user);
    const sensorCount = await this.prisma.sensor.count({ where: { tankId: id } });
    if (sensorCount > 0) {
      throw new ConflictException('Debes reasignar o eliminar los sensores de este tanque antes de poder eliminarlo.');
    }
    return this.prisma.tank.delete({ where: { id } });
  }
}