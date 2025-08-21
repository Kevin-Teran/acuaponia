/**
 * @file jwt.strategy.ts
 * @description Estrategia JWT mejorada para la autenticación con Passport.
 * Valida y extrae información del token JWT para autenticar usuarios.
 * @author Sistema de Acuaponía SENA
 * @version 2.0.0
 * @since 1.0.0
 */

 import { Injectable, UnauthorizedException } from '@nestjs/common';
 import { PassportStrategy } from '@nestjs/passport';
 import { ExtractJwt, Strategy, VerifiedCallback } from 'passport-jwt';
 import { ConfigService } from '@nestjs/config';
 import { UsersService } from '../../users/users.service';
 
 /**
  * @typedef {Object} JwtPayload
  * @property {string} sub - ID único del usuario
  * @property {string} email - Correo electrónico del usuario
  * @property {string} role - Rol del usuario en el sistema
  * @property {number} iat - Timestamp de cuando fue emitido el token
  * @property {number} exp - Timestamp de expiración del token
  */
 interface JwtPayload {
   /** ID único del usuario */
   sub: string;
   /** Correo electrónico del usuario */
   email: string;
   /** Rol del usuario en el sistema */
   role: string;
   /** Timestamp de cuando fue emitido el token */
   iat: number;
   /** Timestamp de expiración del token */
   exp: number;
 }
 
 /**
  * @typedef {Object} ValidatedUser
  * @property {string} userId - ID único del usuario
  * @property {string} email - Correo electrónico del usuario
  * @property {string} role - Rol del usuario
  * @property {string} name - Nombre completo del usuario
  */
 interface ValidatedUser {
   /** ID único del usuario */
   userId: string;
   /** Correo electrónico del usuario */
   email: string;
   /** Rol del usuario */
   role: string;
   /** Nombre completo del usuario */
   name: string;
 }
 
 /**
  * @class JwtStrategy
  * @extends {PassportStrategy}
  * @description Estrategia de autenticación JWT que valida tokens de acceso.
  * Se ejecuta automáticamente cuando se utiliza el guard JwtAuthGuard.
  */
 @Injectable()
 export class JwtStrategy extends PassportStrategy(Strategy) {
   /**
    * @constructor
    * @description Configura la estrategia JWT con las opciones de extracción y validación.
    * @param {ConfigService} configService - Servicio de configuración para obtener variables de entorno
    * @param {UsersService} usersService - Servicio de usuarios para validar la existencia del usuario
    */
   constructor(
     private readonly configService: ConfigService,
     private readonly usersService: UsersService,
   ) {
     super({
       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
       ignoreExpiration: false,
       secretOrKey: configService.get<string>('JWT_SECRET'),
     });
   }
 
   /**
    * @method validate
    * @description Valida el payload del JWT y retorna la información del usuario.
    * Este método es llamado automáticamente por Passport después de verificar el token.
    * @param {JwtPayload} payload - Payload decodificado del token JWT
    * @param {VerifiedCallback} done - Callback de Passport (opcional)
    * @returns {Promise<ValidatedUser>} Información validada del usuario
    * @throws {UnauthorizedException} Cuando el usuario no existe o está inactivo
    * @example
    * // Este método es llamado automáticamente por Passport
    * const user = await jwtStrategy.validate({
    *   sub: 'user123',
    *   email: 'user@sena.edu.co',
    *   role: 'USER',
    *   iat: 1642694400,
    *   exp: 1642697940
    * });
    */
   async validate(payload: JwtPayload, done?: VerifiedCallback): Promise<ValidatedUser> {
     try {
       if (!payload.sub || !payload.email) {
         throw new UnauthorizedException('Token JWT inválido: faltan datos requeridos');
       }
 
       const user = await this.usersService.findById(payload.sub);
       
       if (!user) {
         throw new UnauthorizedException('Usuario no encontrado');
       }
 
       if (user.status !== 'ACTIVE') {
         throw new UnauthorizedException('Usuario inactivo o suspendido');
       }
 
       const validatedUser: ValidatedUser = {
         userId: user.id,
         email: user.email,
         role: user.role,
         name: user.name,
       };
 
       await this.usersService.updateLastLogin(user.id);
 
       if (done) {
         return done(null, validatedUser);
       }
 
       return validatedUser;
     } catch (error) {
       if (done) {
         return done(error, false);
       }
       throw error;
     }
   }
 
   /**
    * @method extractTokenFromRequest
    * @description Método auxiliar para extraer el token de diferentes fuentes.
    * @param {any} request - Objeto de request de Express
    * @returns {string | null} Token extraído o null si no se encuentra
    * @private
    * @example
    * const token = this.extractTokenFromRequest(req);
    * if (token) {
    *   // Procesar token
    * }
    */
   private extractTokenFromRequest(request: any): string | null {
     const authHeader = request.headers.authorization;
     if (authHeader && authHeader.startsWith('Bearer ')) {
       return authHeader.substring(7);
     }
     return null;
   }
 }