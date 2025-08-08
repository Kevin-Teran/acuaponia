import { IsEmail, IsString, IsOptional, MinLength, IsEnum } from 'class-validator';
import { Role, users_status } from '@prisma/client';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(6)
  @IsOptional()
  password?: string;

  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @IsEnum(users_status)
  @IsOptional()
  status?: users_status;
}