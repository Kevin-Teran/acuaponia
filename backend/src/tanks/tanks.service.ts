/**
 * @file tanks.service.ts
 * @description Lógica de negocio para la gestión de tanques.
 * Se implementan validaciones robustas para nombres duplicados, permisos de administrador
 * y protección contra eliminación de tanques con sensores activos.
 * @author Kevin Mariano
 * @version 7.0.0
 * @since 1.0.0
 */
import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';
import { User, Role } from '@prisma/client';

@Injectable()
export class TanksService {
  constructor(private prisma: PrismaService) {}

  /**
   * @method create
   * @description Crea un nuevo tanque, validando que el nombre no esté duplicado para el usuario.
   * @param {CreateTankDto} createTankDto - Datos para la creación del tanque.
   * @param {User} user - El usuario que realiza la acción.
   * @returns {Promise<Tank>} El tanque recién creado.
   * @throws {ConflictException} Si el usuario ya tiene un tanque con el mismo nombre.
   */
  async create(createTankDto: CreateTankDto, user: User) {
    const existingTank = await this.prisma.tank.findFirst({
      where: {
        name: createTankDto.name,
        userId: user.id,
      },
    });

    if (existingTank) {
      throw new ConflictException(`Ya tienes un tanque con el nombre "${createTankDto.name}".`);
    }

    return this.prisma.tank.create({
      data: {
        ...createTankDto,
        userId: user.id,
      },
    });
  }

  /**
   * @method findAllForUser
   * @description Obtiene los tanques. Si el usuario es ADMIN, puede ver todos los tanques o filtrar por usuario.
   * Si es USER, solo ve sus propios tanques.
   * @param {User} currentUser - El usuario que realiza la consulta.
   * @param {string} [targetUserId] - (Opcional para Admins) El ID del usuario a consultar.
   * @returns {Promise<Tank[]>} Una lista de tanques.
   */
  async findAllForUser(currentUser: User, targetUserId?: string) {
    if (currentUser.role === Role.ADMIN) {
      const whereClause = targetUserId ? { userId: targetUserId } : {};
      return this.prisma.tank.findMany({ where: whereClause });
    }

    return this.prisma.tank.findMany({ where: { userId: currentUser.id } });
  }

  /**
   * @method findOne
   * @description Busca un tanque específico por ID, validando los permisos del usuario.
   * @param {string} id - El ID del tanque.
   * @param {User} user - El usuario que realiza la acción.
   * @returns {Promise<Tank>} El tanque encontrado.
   * @throws {NotFoundException} Si el tanque no se encuentra.
   * @throws {ForbiddenException} Si el usuario no tiene permisos.
   */
  async findOne(id: string, user: User) {
    const tank = await this.prisma.tank.findUnique({ where: { id } });
    if (!tank) {
      throw new NotFoundException(`Tanque con ID "${id}" no encontrado.`);
    }
    if (user.role !== Role.ADMIN && tank.userId !== user.id) {
      throw new ForbiddenException('No tienes permiso para acceder a este tanque.');
    }
    return tank;
  }

  /**
   * @method update
   * @description Actualiza un tanque, validando permisos y unicidad del nuevo nombre.
   * @param {string} id - El ID del tanque a actualizar.
   * @param {UpdateTankDto} updateTankDto - Los datos a actualizar.
   * @param {User} user - El usuario que realiza la acción.
   * @returns {Promise<Tank>} El tanque actualizado.
   * @throws {ConflictException} Si el nuevo nombre ya existe en otro tanque del mismo usuario.
   */
  async update(id: string, updateTankDto: UpdateTankDto, user: User) {
    const tankToUpdate = await this.findOne(id, user); 

    if (updateTankDto.name && updateTankDto.name !== tankToUpdate.name) {
      const existingTank = await this.prisma.tank.findFirst({
        where: {
          name: updateTankDto.name,
          userId: tankToUpdate.userId,
          id: { not: id }, 
        },
      });
      if (existingTank) {
        throw new ConflictException(`Ya tienes un tanque con el nombre "${updateTankDto.name}".`);
      }
    }

    return this.prisma.tank.update({
      where: { id },
      data: updateTankDto,
    });
  }

  /**
   * @method remove
   * @description Elimina un tanque, validando que no tenga sensores activos.
   * @param {string} id - El ID del tanque a eliminar.
   * @param {User} user - El usuario que realiza la acción.
   * @returns {Promise<Tank>} El tanque eliminado.
   * @throws {ConflictException} Si el tanque tiene sensores asociados.
   */
  async remove(id: string, user: User) {
    await this.findOne(id, user); 

    const sensorCount = await this.prisma.sensor.count({
      where: { tankId: id },
    });

    if (sensorCount > 0) {
      throw new ConflictException(`No se puede eliminar el tanque porque tiene ${sensorCount} sensor(es) asociado(s).`);
    }

    return this.prisma.tank.delete({ where: { id } });
  }
}