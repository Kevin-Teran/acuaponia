import { IsEmail, IsString, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role, users_status } from '@prisma/client';

/**
 * @class CreateUserDto
 * @description DTO (Data Transfer Object) para validar los datos al crear un nuevo usuario.
 * NestJS usará estas reglas automáticamente gracias al ValidationPipe.
 */
export class CreateUserDto {
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
  name: string;

  @IsEmail({}, { message: 'El formato del correo electrónico no es válido.' })
  @IsNotEmpty({ message: 'El correo electrónico no puede estar vacío.' })
  email: string;

  @IsString({ message: 'La contraseña debe ser un texto.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  @IsNotEmpty({ message: 'La contraseña no puede estar vacía.' })
  password: string;

  @IsEnum(Role, { message: 'El rol seleccionado no es válido.' })
  @IsOptional()
  role?: Role;

  @IsEnum(users_status, { message: 'El estado seleccionado no es válido.' })
  @IsOptional()
  status?: users_status;
}