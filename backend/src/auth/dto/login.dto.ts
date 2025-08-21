/**
 * @file login.dto.ts
 * @description Data Transfer Object (DTO) para validar los datos de entrada del login.
 * @version 1.0.0
 */
export class LoginDto {
  email!: string;
  password!: string;
  rememberMe?: boolean;
}