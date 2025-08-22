import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tank } from '../entities/tank.entity';
import { TankStatus } from '../common/types';

/**
 * @typedef {Object} CreateTankDto
 * @property {string} name - Nombre del tanque
 * @property {string} location - Ubicación del tanque
 * @property {string} userId - ID del usuario propietario
 */
interface CreateTankDto {
  name: string;
  location: string;
  userId: string;
}

/**
 * Servicio de tanques
 * @class TanksService
 * @description Maneja las operaciones CRUD de tanques
 */
@Injectable()
export class TanksService {
  /**
   * Constructor del servicio de tanques
   * @param {Repository<Tank>} tankRepository - Repositorio de tanques
   */
  constructor(
    @InjectRepository(Tank)
    private readonly tankRepository: Repository<Tank>,
  ) {}

  /**
   * Crea un nuevo tanque
   * @async
   * @param {CreateTankDto} createTankDto - Datos del tanque a crear
   * @returns {Promise<Tank>} Tanque creado
   * @example
   * const tank = await tanksService.create({
   *   name: 'Tanque Principal',
   *   location: 'Invernadero A',
   *   userId: 'user-uuid'
   * });
   */
  async create(createTankDto: CreateTankDto): Promise<Tank> {
    const tank = this.tankRepository.create(createTankDto);
    return await this.tankRepository.save(tank);
  }

  /**
   * Busca todos los tanques de un usuario
   * @async
   * @param {string} userId - ID del usuario
   * @returns {Promise<Tank[]>} Lista de tanques del usuario
   * @example
   * const tanks = await tanksService.findByUserId('user-uuid');
   */
  async findByUserId(userId: string): Promise<Tank[]> {
    return await this.tankRepository.find({
      where: { userId },
      relations: ['sensors'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Busca el tanque más reciente de un usuario
   * @async
   * @param {string} userId - ID del usuario
   * @returns {Promise<Tank | null>} Tanque más reciente o null
   * @example
   * const latestTank = await tanksService.findLatestByUserId('user-uuid');
   */
  async findLatestByUserId(userId: string): Promise<Tank | null> {
    return await this.tankRepository.findOne({
      where: { userId },
      relations: ['sensors'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Busca un tanque por ID
   * @async
   * @param {string} id - ID del tanque
   * @returns {Promise<Tank>} Tanque encontrado
   * @throws {NotFoundException} Si el tanque no existe
   * @example
   * const tank = await tanksService.findById('tank-uuid');
   */
  async findById(id: string): Promise<Tank> {
    const tank = await this.tankRepository.findOne({
      where: { id },
      relations: ['sensors', 'user'],
    });

    if (!tank) {
      throw new NotFoundException('Tanque no encontrado');
    }

    return tank;
  }

  /**
   * Actualiza el estado de un tanque
   * @async
   * @param {string} id - ID del tanque
   * @param {TankStatus} status - Nuevo estado
   * @returns {Promise<Tank>} Tanque actualizado
   * @throws {NotFoundException} Si el tanque no existe
   * @example
   * const tank = await tanksService.updateStatus('tank-uuid', TankStatus.MAINTENANCE);
   */
  async updateStatus(id: string, status: TankStatus): Promise<Tank> {
    const tank = await this.findById(id);
    tank.status = status;
    return await this.tankRepository.save(tank);
  }

  /**
   * Elimina un tanque
   * @async
   * @param {string} id - ID del tanque
   * @returns {Promise<void>}
   * @throws {NotFoundException} Si el tanque no existe
   * @example
   * await tanksService.remove('tank-uuid');
   */
  async remove(id: string): Promise<void> {
    const result = await this.tankRepository.delete(id);
    
    if (result.affected === 0) {
      throw new NotFoundException('Tanque no encontrado');
    }
  }
}