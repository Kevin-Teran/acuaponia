import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SensorType, SensorStatus } from '../common/types';
import { Tank } from './tank.entity';

/**
 * Entidad Sensor para la base de datos
 * @class Sensor
 * @description Representa un sensor de monitoreo en el sistema
 */
@Entity('sensors')
export class Sensor {
  /**
   * ID único del sensor
   * @type {string}
   * @public
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID del hardware físico del sensor
   * @type {string}
   * @public
   */
  @Column({ unique: true })
  hardwareId: string;

  /**
   * Nombre descriptivo del sensor
   * @type {string}
   * @public
   */
  @Column()
  name: string;

  /**
   * Tipo de sensor (temperatura, pH, oxígeno)
   * @type {SensorType}
   * @public
   */
  @Column({
    type: 'enum',
    enum: SensorType,
  })
  type: SensorType;

  /**
   * Ubicación específica del sensor
   * @type {string}
   * @public
   */
  @Column()
  location: string;

  /**
   * Estado actual del sensor
   * @type {SensorStatus}
   * @public
   */
  @Column({
    type: 'enum',
    enum: SensorStatus,
    default: SensorStatus.ACTIVE,
  })
  status: SensorStatus;

  /**
   * Fecha de última calibración
   * @type {Date}
   * @public
   */
  @Column()
  calibrationDate: Date;

  /**
   * Última lectura registrada
   * @type {number}
   * @public
   */
  @Column({ type: 'float', nullable: true })
  lastReading: number;

  /**
   * Fecha de última actualización de lectura
   * @type {Date}
   * @public
   */
  @Column({ nullable: true })
  lastUpdate: Date;

  /**
   * Fecha de creación del sensor
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
   * ID del tanque al que pertenece
   * @type {string}
   * @public
   */
  @Column()
  tankId: string;

  /**
   * Tanque al que pertenece el sensor
   * @type {Tank}
   * @public
   */
  @ManyToOne(() => Tank, tank => tank.sensors)
  @JoinColumn({ name: 'tankId' })
  tank: Tank;

  /**
   * Constructor de la clase Sensor
   * @param {Partial<Sensor>} [partial] - Datos parciales para inicializar el sensor
   * @example
   * const sensor = new Sensor({
   *   hardwareId: 'TEMP001',
   *   name: 'Sensor Temperatura Principal',
   *   type: SensorType.TEMPERATURE,
   *   tankId: 'tank-uuid'
   * });
   */
  constructor(partial?: Partial<Sensor>) {
    Object.assign(this, partial);
  }

  /**
   * Verifica si el sensor está operativo
   * @returns {boolean} True si está activo
   * @example
   * const isOperational = sensor.isOperational();
   */
  isOperational(): boolean {
    return this.status === SensorStatus.ACTIVE;
  }

  /**
   * Actualiza la lectura del sensor
   * @param {number} value - Nuevo valor de lectura
   * @returns {void}
   * @throws {Error} Si el valor no es válido
   * @example
   * sensor.updateReading(25.5);
   */
  updateReading(value: number): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error('El valor de lectura debe ser un número válido');
    }
    
    this.lastReading = value;
    this.lastUpdate = new Date();
  }

  /**
   * Verifica si el sensor necesita calibración
   * @param {number} [daysThreshold=30] - Días límite para calibración
   * @returns {boolean} True si necesita calibración
   * @example
   * const needsCalibration = sensor.needsCalibration(30);
   */
  needsCalibration(daysThreshold: number = 30): boolean {
    const daysSinceCalibration = Math.floor(
      (Date.now() - this.calibrationDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSinceCalibration > daysThreshold;
  }
}