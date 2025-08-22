import { IsNotEmpty, IsString } from 'class-validator';

/**
 * @class RefreshTokenDto
 * @description DTO para validar el cuerpo de la solicitud de refresco de token.
 */
export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}