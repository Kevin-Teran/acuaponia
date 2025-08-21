/**
 * @file users.service.ts
 * @description Servicio que contiene la lógica de negocio para las operaciones con usuarios.
 * Abstrae las interacciones con la base de datos relacionadas con el modelo User.
 * @version 1.0.0
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * @description Busca un usuario por su correo electrónico único.
   * Este método es fundamental para el proceso de autenticación.
   * @param email El correo electrónico del usuario a buscar.
   * @returns Una promesa que resuelve con el objeto User si se encuentra, o null en caso contrario.
   */
  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
}