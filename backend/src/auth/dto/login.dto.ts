/**
 * @file login.dto.ts
 * @description Data Transfer Object (DTO) para validar los datos de entrada del login.
 * @version 2.0.0
 */
 import { IsEmail, IsNotEmpty, IsString, IsBoolean, IsOptional, MinLength } from 'class-validator';

 export class LoginDto {
   @IsNotEmpty({ message: 'El correo electrónico no puede estar vacío.' })
   @IsEmail({}, { message: 'El formato del correo electrónico no es válido.' })
   email!: string;
 
   @IsNotEmpty({ message: 'La contraseña no puede estar vacía.' })
   @IsString({ message: 'La contraseña debe ser una cadena de texto.' })
   @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
   password!: string;
 
   @IsOptional()
   @IsBoolean({ message: 'La opción de recordar sesión debe ser un valor booleano.' })
   rememberMe?: boolean;
 }
