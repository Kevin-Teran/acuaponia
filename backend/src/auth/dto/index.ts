/**
 * @file dto/index.ts
 * @description Data Transfer Objects (DTOs) para validación de datos de entrada en endpoints de autenticación.
 * Utiliza class-validator para validaciones automáticas y decoradores de Swagger para documentación.
 * @author Sistema de Acuaponía SENA
 * @version 2.0.0
 * @since 1.0.0
 */

import { IsEmail, IsString, IsBoolean, IsOptional, MinLength, MaxLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * @class LoginDto
 * @description DTO para validar los datos de entrada del proceso de login.
 * Incluye validaciones de formato y restricciones de seguridad.
 */
export class LoginDto {
  /**
   * @property {string} email
   * @description Correo electrónico del usuario que intenta autenticarse.
   * Debe tener un formato válido de email y es requerido.
   * @example "admin@sena.edu.co"
   */
  @ApiProperty({
    description: 'Correo electrónico del usuario registrado en el sistema',
    example: 'admin@sena.edu.co',
    type: String,
    format: 'email',
    minLength: 5,
    maxLength: 100
  })
  @IsEmail({}, { 
    message: 'El correo electrónico debe tener un formato válido' 
  })
  @IsNotEmpty({ 
    message: 'El correo electrónico es obligatorio' 
  })
  @MaxLength(100, { 
    message: 'El correo electrónico no puede exceder 100 caracteres' 
  })
  readonly email!: string;

  /**
   * @property {string} password
   * @description Contraseña del usuario en texto plano.
   * Debe tener al menos 6 caracteres por seguridad.
   * @example "password123"
   */
  @ApiProperty({
    description: 'Contraseña del usuario (mínimo 6 caracteres)',
    example: 'password123',
    type: String,
    minLength: 6,
    maxLength: 128
  })
  @IsString({ 
    message: 'La contraseña debe ser una cadena de texto' 
  })
  @IsNotEmpty({ 
    message: 'La contraseña es obligatoria' 
  })
  @MinLength(6, { 
    message: 'La contraseña debe tener al menos 6 caracteres' 
  })
  @MaxLength(128, { 
    message: 'La contraseña no puede exceder 128 caracteres' 
  })
  readonly password!: string;

  /**
   * @property {boolean} rememberMe
   * @description Indica si el usuario desea mantener la sesión activa por más tiempo.
   * Cuando es true, genera tokens con mayor duración.
   * @example true
   */
  @ApiPropertyOptional({
    description: 'Mantener la sesión activa por más tiempo (genera tokens de larga duración)',
    example: true,
    type: Boolean,
    default: false
  })
  @IsOptional()
  @IsBoolean({ 
    message: 'rememberMe debe ser un valor booleano (true/false)' 
  })
  readonly rememberMe?: boolean = false;
}

/**
 * @class RefreshTokenDto
 * @description DTO para validar el refresh token en el proceso de renovación.
 * Asegura que se proporcione un token válido para la renovación.
 */
export class RefreshTokenDto {
  /**
   * @property {string} refresh_token
   * @description Token de actualización JWT válido para generar un nuevo access token.
   * Debe ser proporcionado exactamente como fue emitido durante el login.
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  @ApiProperty({
    description: 'Token de actualización JWT válido emitido durante el login',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    type: String,
    minLength: 10
  })
  @IsString({ 
    message: 'El refresh token debe ser una cadena de texto' 
  })
  @IsNotEmpty({ 
    message: 'El refresh token es obligatorio' 
  })
  @MinLength(10, { 
    message: 'El refresh token parece ser inválido (muy corto)' 
  })
  readonly refresh_token!: string;
}

/**
 * @class ChangePasswordDto
 * @description DTO para validar el cambio de contraseña de usuarios autenticados.
 * Incluye validación de contraseña actual y nueva contraseña.
 */
export class ChangePasswordDto {
  /**
   * @property {string} currentPassword
   * @description Contraseña actual del usuario para verificar identidad.
   * Debe coincidir con la contraseña almacenada en la base de datos.
   * @example "oldPassword123"
   */
  @ApiProperty({
    description: 'Contraseña actual del usuario para verificación de seguridad',
    example: 'oldPassword123',
    type: String,
    minLength: 6
  })
  @IsString({ 
    message: 'La contraseña actual debe ser una cadena de texto' 
  })
  @IsNotEmpty({ 
    message: 'La contraseña actual es obligatoria' 
  })
  @MinLength(6, { 
    message: 'La contraseña actual debe tener al menos 6 caracteres' 
  })
  readonly currentPassword!: string;

  /**
   * @property {string} newPassword
   * @description Nueva contraseña que el usuario desea establecer.
   * Debe cumplir con los requisitos mínimos de seguridad del sistema.
   * @example "newSecurePassword456"
   */
  @ApiProperty({
    description: 'Nueva contraseña que cumple con los requisitos de seguridad (mínimo 6 caracteres)',
    example: 'newSecurePassword456',
    type: String,
    minLength: 6,
    maxLength: 128
  })
  @IsString({ 
    message: 'La nueva contraseña debe ser una cadena de texto' 
  })
  @IsNotEmpty({ 
    message: 'La nueva contraseña es obligatoria' 
  })
  @MinLength(6, { 
    message: 'La nueva contraseña debe tener al menos 6 caracteres' 
  })
  @MaxLength(128, { 
    message: 'La nueva contraseña no puede exceder 128 caracteres' 
  })
  readonly newPassword!: string;

  /**
   * @property {string} confirmPassword
   * @description Confirmación de la nueva contraseña para evitar errores de escritura.
   * Debe ser idéntica a newPassword.
   * @example "newSecurePassword456"
   */
  @ApiProperty({
    description: 'Confirmación de la nueva contraseña (debe coincidir exactamente)',
    example: 'newSecurePassword456',
    type: String,
    minLength: 6
  })
  @IsString({ 
    message: 'La confirmación de contraseña debe ser una cadena de texto' 
  })
  @IsNotEmpty({ 
    message: 'La confirmación de contraseña es obligatoria' 
  })
  @MinLength(6, { 
    message: 'La confirmación debe tener al menos 6 caracteres' 
  })
  readonly confirmPassword!: string;

  /**
   * @method validatePasswordsMatch
   * @description Método personalizado para validar que las contraseñas coincidan.
   * Se puede utilizar en validaciones personalizadas o en el servicio.
   * @returns {boolean} true si las contraseñas coinciden
   * @example
   * const dto = new ChangePasswordDto();
   * if (!dto.validatePasswordsMatch()) {
   *   throw new BadRequestException('Las contraseñas no coinciden');
   * }
   */
  validatePasswordsMatch(): boolean {
    return this.newPassword === this.confirmPassword;
  }
}

/**
 * @class ForgotPasswordDto
 * @description DTO para solicitar restablecimiento de contraseña.
 * Solo requiere el email del usuario registrado.
 */
export class ForgotPasswordDto {
  /**
   * @property {string} email
   * @description Correo electrónico del usuario que solicita restablecer su contraseña.
   * Debe estar registrado en el sistema para generar un token de recuperación.
   * @example "usuario@sena.edu.co"
   */
  @ApiProperty({
    description: 'Correo electrónico registrado en el sistema para enviar instrucciones de recuperación',
    example: 'usuario@sena.edu.co',
    type: String,
    format: 'email'
  })
  @IsEmail({}, { 
    message: 'El correo electrónico debe tener un formato válido' 
  })
  @IsNotEmpty({ 
    message: 'El correo electrónico es obligatorio para recuperar la contraseña' 
  })
  @MaxLength(100, { 
    message: 'El correo electrónico no puede exceder 100 caracteres' 
  })
  readonly email!: string;
}

/**
 * @class ResetPasswordDto
 * @description DTO para restablecer contraseña usando un token de recuperación.
 * Incluye el token enviado por email y la nueva contraseña.
 */
export class ResetPasswordDto {
  /**
   * @property {string} token
   * @description Token único de recuperación enviado al email del usuario.
   * Tiene tiempo limitado de validez por seguridad.
   * @example "reset_token_abc123def456"
   */
  @ApiProperty({
    description: 'Token de recuperación enviado al correo electrónico del usuario',
    example: 'reset_token_abc123def456',
    type: String,
    minLength: 10
  })
  @IsString({ 
    message: 'El token de recuperación debe ser una cadena de texto' 
  })
  @IsNotEmpty({ 
    message: 'El token de recuperación es obligatorio' 
  })
  @MinLength(10, { 
    message: 'El token de recuperación parece ser inválido' 
  })
  readonly token!: string;

  /**
   * @property {string} newPassword
   * @description Nueva contraseña que el usuario desea establecer.
   * Debe cumplir con los requisitos de seguridad del sistema.
   * @example "myNewSecurePassword789"
   */
  @ApiProperty({
    description: 'Nueva contraseña segura (mínimo 6 caracteres)',
    example: 'myNewSecurePassword789',
    type: String,
    minLength: 6,
    maxLength: 128
  })
  @IsString({ 
    message: 'La nueva contraseña debe ser una cadena de texto' 
  })
  @IsNotEmpty({ 
    message: 'La nueva contraseña es obligatoria' 
  })
  @MinLength(6, { 
    message: 'La nueva contraseña debe tener al menos 6 caracteres' 
  })
  @MaxLength(128, { 
    message: 'La nueva contraseña no puede exceder 128 caracteres' 
  })
  readonly newPassword!: string;

  /**
   * @property {string} confirmPassword
   * @description Confirmación de la nueva contraseña para evitar errores.
   * Debe ser idéntica a newPassword.
   * @example "myNewSecurePassword789"
   */
  @ApiProperty({
    description: 'Confirmación de la nueva contraseña',
    example: 'myNewSecurePassword789',
    type: String,
    minLength: 6
  })
  @IsString({ 
    message: 'La confirmación de contraseña debe ser una cadena de texto' 
  })
  @IsNotEmpty({ 
    message: 'La confirmación de contraseña es obligatoria' 
  })
  @MinLength(6, { 
    message: 'La confirmación debe tener al menos 6 caracteres' 
  })
  readonly confirmPassword!: string;

  /**
   * @method validatePasswordsMatch
   * @description Valida que la nueva contraseña y su confirmación coincidan.
   * @returns {boolean} true si las contraseñas son idénticas
   */
  validatePasswordsMatch(): boolean {
    return this.newPassword === this.confirmPassword;
  }
}