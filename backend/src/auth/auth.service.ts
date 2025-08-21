/**
 * @file auth.service.ts
 * @description Servicio principal de autenticación que maneja login, validación de usuarios
 * y generación de tokens JWT con funcionalidades avanzadas de seguridad.
 * @author Sistema de Acuaponía SENA
 * @version 3.0.0
 * @since 1.0.0
 */

 import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
 import { JwtService } from '@nestjs/jwt';
 import { ConfigService } from '@nestjs/config';
 import { UsersService } from '../users/users.service';
 import * as bcrypt from 'bcrypt';
 import { Role } from '@prisma/client';
 
 /**
  * @typedef {Object} LoginResponse
  * @property {string} access_token - Token de acceso JWT
  * @property {string} refresh_token - Token de actualización (opcional)
  * @property {UserInfo} user - Información básica del usuario
  * @property {number} expires_in - Tiempo de expiración en segundos
  */
 interface LoginResponse {
   /** Token de acceso JWT */
   access_token: string;
   /** Token de actualización para renovar el acceso */
   refresh_token?: string;
   /** Información básica del usuario */
   user: UserInfo;
   /** Tiempo de expiración en segundos */
   expires_in: number;
 }
 
 /**
  * @typedef {Object} UserInfo
  * @property {string} id - ID único del usuario
  * @property {string} email - Correo electrónico
  * @property {string} name - Nombre completo
  * @property {string} role - Rol del usuario
  */
 interface UserInfo {
   id: string;
   email: string;
   name: string;
   role: Role;
 }
 
 /**
  * @typedef {Object} JwtPayload
  * @property {string} sub - Subject (ID del usuario)
  * @property {string} email - Correo electrónico
  * @property {string} role - Rol del usuario
  * @property {string} tokenType - Tipo de token ('access' | 'refresh')
  */
 interface JwtPayload {
   sub: string;
   email: string;
   role: Role;
   tokenType: 'access' | 'refresh';
 }
 
 /**
  * @class AuthService
  * @description Servicio que encapsula toda la lógica de autenticación del sistema.
  * Maneja validación de credenciales, generación de tokens y gestión de sesiones.
  */
 @Injectable()
 export class AuthService {
   /** @private {Logger} logger - Logger específico para este servicio */
   private readonly logger = new Logger(AuthService.name);
 
   /** @private {number} MAX_LOGIN_ATTEMPTS - Máximo número de intentos de login */
   private readonly MAX_LOGIN_ATTEMPTS = 5;
 
   /** @private {number} LOCKOUT_TIME - Tiempo de bloqueo en milisegundos */
   private readonly LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutos
 
   /** @private {Map<string, LoginAttempt>} loginAttempts - Cache de intentos de login */
   private readonly loginAttempts = new Map<string, LoginAttempt>();
 
   /**
    * @constructor
    * @description Inicializa el servicio de autenticación con sus dependencias.
    * @param {UsersService} usersService - Servicio para gestión de usuarios
    * @param {JwtService} jwtService - Servicio para manejo de tokens JWT
    * @param {ConfigService} configService - Servicio de configuración
    */
   constructor(
     private readonly usersService: UsersService,
     private readonly jwtService: JwtService,
     private readonly configService: ConfigService,
   ) {}
 
   /**
    * @method validateUser
    * @description Valida las credenciales de un usuario (email y contraseña).
    * Incluye validación de intentos de login y bloqueo por seguridad.
    * @param {string} email - Correo electrónico del usuario
    * @param {string} password - Contraseña en texto plano
    * @returns {Promise<UserInfo | null>} Información del usuario si es válido, null si no
    * @throws {UnauthorizedException} Cuando el usuario está bloqueado por múltiples intentos
    * @throws {BadRequestException} Cuando los parámetros son inválidos
    * @example
    * const user = await authService.validateUser('user@sena.edu.co', 'password123');
    * if (user) {
    * console.log('Usuario válido:', user.name);
    * }
    */
   async validateUser(email: string, password: string): Promise<UserInfo | null> {
     try {
       if (!email || !password) {
         throw new BadRequestException('Email y contraseña son requeridos');
       }
 
       if (this.isUserLocked(email)) {
         throw new UnauthorizedException(
           `Usuario bloqueado por múltiples intentos fallidos. Intente nuevamente en ${
             Math.ceil((this.getRemainingLockTime(email)) / 60000)
           } minutos.`
         );
       }
 
       const user = await this.usersService.findOneByEmail(email);
       
       if (!user) {
         this.recordFailedAttempt(email);
         return null;
       }
 
       if (user.status !== 'ACTIVE') {
         this.logger.warn(`Intento de login de usuario inactivo: ${email}`);
         throw new UnauthorizedException('Usuario inactivo o suspendido');
       }
 
       const isPasswordValid = await bcrypt.compare(password, user.password);
       
       if (!isPasswordValid) {
         this.recordFailedAttempt(email);
         return null;
       }
 
       this.clearFailedAttempts(email);
       
       const userInfo: UserInfo = {
         id: user.id,
         email: user.email,
         name: user.name,
         role: user.role,
       };
 
       this.logger.log(`Login exitoso para usuario: ${email}`);
       return userInfo;
 
     } catch (error) {
       if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
         throw error;
       }
       
       this.logger.error(`Error durante validación de usuario: ${error.message}`, error.stack);
       throw new UnauthorizedException('Error interno durante la validación');
     }
   }
 
   /**
    * @method login
    * @description Autentica a un usuario y genera tokens de acceso.
    * @param {UserInfo} user - Información del usuario ya validado
    * @param {boolean} rememberMe - Si debe generar un token de larga duración
    * @returns {Promise<LoginResponse>} Respuesta con tokens y información del usuario
    * @throws {UnauthorizedException} Cuando no se puede generar el token
    * @example
    * const loginResponse = await authService.login(userInfo, true);
    * console.log('Token generado:', loginResponse.access_token);
    */
   async login(user: UserInfo, rememberMe: boolean = false): Promise<LoginResponse> {
     try {
       const payload: JwtPayload = {
         sub: user.id,
         email: user.email,
         role: user.role,
         tokenType: 'access',
       };
 
       const expiresIn = rememberMe ? '7d' : '1h';
       const expiresInSeconds = rememberMe ? 7 * 24 * 60 * 60 : 60 * 60;
 
       const accessToken = this.jwtService.sign(payload, { 
         expiresIn,
         issuer: 'sena-aquaponics',
         audience: 'sena-users',
       });
 
       let refreshToken: string | undefined;
       if (rememberMe) {
         const refreshPayload: JwtPayload = {
           ...payload,
           tokenType: 'refresh',
         };
         
         refreshToken = this.jwtService.sign(refreshPayload, {
           expiresIn: '30d',
           secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
         });
       }
 
       await this.usersService.updateLastLogin(user.id);
 
       const response: LoginResponse = {
         access_token: accessToken,
         refresh_token: refreshToken,
         user: {
           id: user.id,
           email: user.email,
           name: user.name,
           role: user.role,
         },
         expires_in: expiresInSeconds,
       };
 
       this.logger.log(`Token generado exitosamente para usuario: ${user.email}`);
       return response;
 
     } catch (error) {
       this.logger.error(`Error durante generación de token: ${error.message}`, error.stack);
       throw new UnauthorizedException('No se pudo generar el token de autenticación');
     }
   }
 
   /**
    * @method refreshToken
    * @description Renueva un token de acceso utilizando un refresh token.
    * @param {string} refreshToken - Token de actualización válido
    * @returns {Promise<{access_token: string, expires_in: number}>} Nuevo token de acceso
    * @throws {UnauthorizedException} Cuando el refresh token es inválido
    * @example
    * const newToken = await authService.refreshToken(oldRefreshToken);
    * console.log('Nuevo token:', newToken.access_token);
    */
   async refreshToken(refreshToken: string): Promise<{access_token: string, expires_in: number}> {
     try {
       const payload = this.jwtService.verify(refreshToken, {
         secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
       }) as JwtPayload;
 
       if (payload.tokenType !== 'refresh') {
         throw new UnauthorizedException('Token de tipo incorrecto');
       }
 
       const user = await this.usersService.findById(payload.sub);
       if (!user || user.status !== 'ACTIVE') {
         throw new UnauthorizedException('Usuario no válido');
       }
 
       const newPayload: JwtPayload = {
         sub: payload.sub,
         email: payload.email,
         role: payload.role,
         tokenType: 'access',
       };
 
       const accessToken = this.jwtService.sign(newPayload, {
         expiresIn: '1h',
       });
 
       return {
         access_token: accessToken,
         expires_in: 3600,
       };
 
     } catch (error) {
       this.logger.warn(`Intento de renovación con token inválido: ${error.message}`);
       throw new UnauthorizedException('Refresh token inválido o expirado');
     }
   }
 
   /**
    * @method validateRefreshToken
    * @description Valida un refresh token sin renovarlo.
    * @param {string} token - Token a validar
    * @returns {boolean} True si el token es válido
    * @private
    */
   private validateRefreshToken(token: string): boolean {
     try {
       const payload = this.jwtService.verify(token, {
         secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
       });
       return payload.tokenType === 'refresh';
     } catch {
       return false;
     }
   }
 
   /**
    * @method recordFailedAttempt
    * @description Registra un intento fallido de login para un email.
    * @param {string} email - Email del usuario
    * @private
    */
   private recordFailedAttempt(email: string): void {
     const now = Date.now();
     const attempts = this.loginAttempts.get(email) || { count: 0, lastAttempt: now, lockedUntil: null };
     
     attempts.count += 1;
     attempts.lastAttempt = now;
     
     if (attempts.count >= this.MAX_LOGIN_ATTEMPTS) {
       attempts.lockedUntil = now + this.LOCKOUT_TIME;
       this.logger.warn(`Usuario ${email} bloqueado por ${this.MAX_LOGIN_ATTEMPTS} intentos fallidos`);
     }
     
     this.loginAttempts.set(email, attempts);
   }
 
   /**
    * @method isUserLocked
    * @description Verifica si un usuario está bloqueado por intentos fallidos.
    * @param {string} email - Email del usuario
    * @returns {boolean} True si está bloqueado
    * @private
    */
   private isUserLocked(email: string): boolean {
     const attempts = this.loginAttempts.get(email);
     if (!attempts || !attempts.lockedUntil) return false;
     
     const now = Date.now();
     if (now > attempts.lockedUntil) {
       this.clearFailedAttempts(email);
       return false;
     }
     
     return true;
   }
 
   /**
    * @method getRemainingLockTime
    * @description Obtiene el tiempo restante de bloqueo en milisegundos.
    * @param {string} email - Email del usuario
    * @returns {number} Tiempo restante en milisegundos
    * @private
    */
   private getRemainingLockTime(email: string): number {
     const attempts = this.loginAttempts.get(email);
     if (!attempts || !attempts.lockedUntil) return 0;
     
     return Math.max(0, attempts.lockedUntil - Date.now());
   }
 
   /**
    * @method clearFailedAttempts
    * @description Limpia los intentos fallidos de un usuario.
    * @param {string} email - Email del usuario
    * @private
    */
   private clearFailedAttempts(email: string): void {
     this.loginAttempts.delete(email);
   }
 }
 
 /**
  * @typedef {Object} LoginAttempt
  * @property {number} count - Número de intentos fallidos
  * @property {number} lastAttempt - Timestamp del último intento
  * @property {number | null} lockedUntil - Timestamp hasta cuando está bloqueado
  */
 interface LoginAttempt {
   count: number;
   lastAttempt: number;
   lockedUntil: number | null;
 }