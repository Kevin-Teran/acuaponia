import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TankStatus } from '../common/types';
import { User } from './user.entity';
import { Sensor } from './sensor.entity';

/**
 * Entidad Tanque para la base de datos
 * @class Tank
 * @description Representa un tanque de acuaponía en el sistema
 */
@Entity('tanks')
export class Tank {
  /**
   * ID único del tanque
   * @type {string}
   * @public
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nombre del tanque
   * @type {string}
   * @public
   */
  @Column()
  name: string;

  /**
   * Ubicación física del tanque
   * @type {string}
   * @public
   */
  @Column()
  location: string;

  /**
   * Estado actual del tanque
   * @type {TankStatus}
   * @public
   */
  @Column({
    type: 'enum',
    enum: TankStatus,
    default: TankStatus.ACTIVE,
  })
  status: TankStatus;

  /**
   * Fecha de creación del tanque
   * @type {Date}
   * @public
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Fecha de última actualización
   * @type {Date}
   * @public
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * ID del usuario propietario
   * @type {string}
   * @public
   */
  @Column()
  userId: string;

  /**
   * Usuario propietario del tanque
   * @type {User}
   * @public
   */
  @ManyToOne(() => User, user => user.tanks)
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Sensores asociados al tanque
   * @type {Sensor[]}
   * @public
   */
  @OneToMany(() => Sensor, sensor => sensor.tank)
  sensors: Sensor[];

  /**
   * Constructor de la clase Tank
   * @param {Partial<Tank>} [partial] - Datos parciales para inicializar el tanque
   * @example
   * const tank = new Tank({
   *   name: 'Tanque Principal',
   *   location: 'Invernadero A',
   *   userId: 'user-uuid'
   * });
   */
  constructor(partial?: Partial<Tank>) {
    Object.assign(this, partial);
  }

  /**
   * Verifica si el tanque está activo
   * @returns {boolean} True si está activo
   * @example
   * const isActive = tank.isActive();
   */
  isActive(): boolean {
    return this.status === TankStatus.ACTIVE;
  }

  /**
   * Cambia el estado del tanque a mantenimiento
   * @returns {void}
   * @example
   * tank.setMaintenance();
   */
  setMaintenance(): void {
    this.status = TankStatus.MAINTENANCE;
  }
}