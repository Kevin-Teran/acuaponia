import { IsEmail, IsString, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';
import { Role, users_status } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

/**
 * @class CreateUserDto
 * @description DTO (Data Transfer Object) para validar los datos al crear un nuevo usuario.
 * Utilizado por class-validator para aplicar reglas de validación automáticas.
 */
export class CreateUserDto {
  @ApiProperty({
    description: 'El nombre completo del usuario.',
    example: 'John Doe',
  })
  @IsString({ message: 'El nombre debe ser un texto.' })
  @IsNotEmpty({ message: 'El nombre no puede estar vacío.' })
  name: string;

  @ApiProperty({
    description: 'La dirección de correo electrónico del usuario. Debe ser única.',
    example: 'john.doe@example.com',
  })
  @IsEmail({}, { message: 'El formato del correo electrónico no es válido.' })
  @IsNotEmpty({ message: 'El correo electrónico no puede estar vacío.' })
  email: string;

  @ApiProperty({
    description: 'La contraseña del usuario. Debe tener al menos 6 caracteres.',
    example: 'password123',
  })
  @IsString({ message: 'La contraseña debe ser un texto.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  @IsNotEmpty({ message: 'La contraseña no puede estar vacía.' })
  password: string;

  @ApiProperty({
    description: 'El rol del usuario en el sistema.',
    enum: Role,
    default: Role.USER,
    required: false,
  })
  @IsEnum(Role, { message: 'El rol seleccionado no es válido.' })
  @IsOptional()
  role?: Role;

  @ApiProperty({
    description: 'El estado del usuario (activo o inactivo).',
    enum: users_status,
    default: users_status.ACTIVE,
    required: false,
  })
  @IsEnum(users_status, { message: 'El estado seleccionado no es válido.' })
  @IsOptional()
  status?: users_status;
}