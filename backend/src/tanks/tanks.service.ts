import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTankDto } from './dto/create-tank.dto';
import { UpdateTankDto } from './dto/update-tank.dto';
import { User } from '@prisma/client';

/**
 * @class TanksService
 * @description Contiene toda la lógica de negocio para la gestión de tanques. Interactúa con la base de datos a través de Prisma para realizar operaciones CRUD sobre la entidad Tank.
 * @technical_requirements PrismaService para la interacción con la base de datos. DTOs para validación de datos. Manejo de excepciones de NestJS.
 */
@Injectable()
export class TanksService {
  constructor(private prisma: PrismaService) {}

  /**
   * @description Crea un nuevo tanque, validando permisos y unicidad del nombre.
   * @param {CreateTankDto} createTankDto - Datos para la creación del tanque.
   * @param {User} user - Usuario autenticado que realiza la acción.
   * @returns {Promise<Tank>} El tanque creado.
   * @throws {ConflictException} Si el usuario ya tiene un tanque con el mismo nombre.
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
   * @description Obtiene una lista de tanques. Si el usuario es ADMIN, devuelve todos los tanques o filtra por un `targetUserId`. Si no es ADMIN, solo obtiene sus propios tanques.
   * @param {User} currentUser - El usuario que realiza la petición.
   * @param {string} [targetUserId] - (Opcional) El ID del usuario por el cual un administrador desea filtrar los tanques.
   * @returns {Promise<Tank[]>} Una lista de tanques con información del usuario y conteo de sensores.
   */
  findAllForUser(currentUser: User, targetUserId?: string) {
    const whereClause: { userId?: string } = {};

    if (currentUser.role !== 'ADMIN') {
      // Los usuarios no-administradores solo pueden ver sus propios tanques.
      whereClause.userId = currentUser.id;
    } else if (targetUserId) {
      // Un administrador puede solicitar los tanques de un usuario específico.
      whereClause.userId = targetUserId;
    }
    // Si es ADMIN y no se provee targetUserId, whereClause queda vacío para obtener todos los tanques.

    return this.prisma.tank.findMany({ 
        where: whereClause,
        include: { user: { select: { name: true } }, _count: { select: { sensors: true } } },
        orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * @description Busca un único tanque por su ID, validando los permisos de acceso.
   * @param {string} id - El ID del tanque a buscar.
   * @param {User} user - El usuario autenticado.
   * @returns {Promise<Tank>} El tanque encontrado.
   * @throws {NotFoundException} Si el tanque no se encuentra.
   * @throws {ForbiddenException} Si el usuario no tiene permisos sobre el tanque.
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
   * @param {string} id - El ID del tanque a actualizar.
   * @param {UpdateTankDto} updateTankDto - Los datos para actualizar.
   * @param {User} user - El usuario autenticado.
   * @returns {Promise<Tank>} El tanque actualizado.
   * @throws {ConflictException} Si el nuevo nombre ya existe para ese usuario.
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
   * @param {string} id - El ID del tanque a eliminar.
   * @param {User} user - El usuario autenticado.
   * @returns {Promise<Tank>} El tanque que fue eliminado.
   * @throws {ConflictException} Si el tanque aún tiene sensores asociados.
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