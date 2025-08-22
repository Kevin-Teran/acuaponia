import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Por favor, introduce una dirección de correo electrónico válida.' })
  @IsNotEmpty({ message: 'El correo electrónico no puede estar vacío.' })
  email: string;
}