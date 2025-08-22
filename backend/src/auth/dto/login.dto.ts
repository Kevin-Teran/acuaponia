import { IsEmail, IsString, MinLength, IsBoolean, IsOptional } from 'class-validator';

/**
 * @class LoginDto
 * @description Data Transfer Object (DTO) para la validación de los datos de inicio de sesión.
 * Define las reglas que deben cumplir los datos de entrada para la ruta de login.
 */
export class LoginDto {
  /**
   * @property {string} email - El correo electrónico del usuario.
   * @description Debe ser una dirección de correo válida.
   */
  @IsEmail({}, { message: 'El correo electrónico debe ser válido.' })
  email: string;

  /**
   * @property {string} password - La contraseña del usuario.
   * @description Debe tener al menos 6 caracteres.
   */
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  password: string;

  /**
   * @property {boolean} [rememberMe] - Opción para recordar la sesión.
   * @description Si es true, el token de refresco tendrá una mayor duración.
   */
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}