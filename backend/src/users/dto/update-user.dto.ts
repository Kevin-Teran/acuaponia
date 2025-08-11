import { IsEmail, IsString, IsOptional, MinLength, IsEnum } from 'class-validator';
import { Role, users_status } from '@prisma/client';

/**
 * @class UpdateUserDto
 * @description DTO para validar los datos al actualizar un usuario. Todos los campos son opcionales.
 */
export class UpdateUserDto {
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsOptional()
  name?: string;

  @IsEmail({}, { message: 'El formato del correo electrónico no es válido.' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'La contraseña debe ser un texto.' })
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres.' })
  @IsOptional()
  password?: string;

  @IsEnum(Role, { message: 'El rol seleccionado no es válido.' })
  @IsOptional()
  role?: Role;

  @IsEnum(users_status, { message: 'El estado seleccionado no es válido.' })
  @IsOptional()
  status?: users_status;
}