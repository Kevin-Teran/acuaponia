import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { UserRole } from '../common/types';
import { Tank } from './tank.entity';

/**
 * Entidad Usuario para la base de datos
 * @class User
 * @description Representa un usuario del sistema de acuaponía
 */
@Entity('users')
export class User {
  /**
   * ID único del usuario
   * @type {string}
   * @public
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Email del usuario (único)
   * @type {string}
   * @public
   */
  @Column({ unique: true })
  email: string;

  /**
   * Contraseña hasheada del usuario
   * @type {string}
   * @private
   */
  @Column()
  @Exclude()
  password: string;

  /**
   * Nombre completo del usuario
   * @type {string}
   * @public
   */
  @Column()
  name: string;

  /**
   * Rol del usuario en el sistema
   * @type {UserRole}
   * @public
   */
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  /**
   * Estado del usuario
   * @type {string}
   * @public
   */
  @Column({ default: 'ACTIVE' })
  status: string;

  /**
   * Fecha de creación del usuario
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
   * Fecha del último login
   * @type {Date}
   * @public
   */
  @Column({ nullable: true })
  lastLogin: Date;

  /**
   * Configuraciones personalizadas del usuario
   * @type {object}
   * @public
   */
  @Column({ type: 'json', nullable: true })
  settings: object;

  /**
   * Tanques asociados al usuario
   * @type {Tank[]}
   * @public
   */
  @OneToMany(() => Tank, tank => tank.user)
  tanks: Tank[];

  /**
   * Constructor de la clase User
   * @param {Partial<User>} [partial] - Datos parciales para inicializar el usuario
   * @example
   * const user = new User({
   *   email: 'user@example.com',
   *   name: 'John Doe',
   *   role: UserRole.USER
   * });
   */
  constructor(partial?: Partial<User>) {
    Object.assign(this, partial);
  }

  /**
   * Verifica si el usuario es administrador
   * @returns {boolean} True si es administrador
   * @example
   * const isAdmin = user.isAdmin();
   */
  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  /**
   * Actualiza la fecha del último login
   * @returns {void}
   * @example
   * user.updateLastLogin();
   */
  updateLastLogin(): void {
    this.lastLogin = new Date();
  }
}