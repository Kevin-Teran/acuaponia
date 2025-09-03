/**
 * @file current-user.decorator.ts
 * @route 
 * @description Decorador para extraer el usuario autenticado del request
 * @author Kevin Mariano
 * @version 1.1.2
 * @since 1.0.00
 * @copyright SENA 2025
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';
 
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Pick<User, 'id' | 'role'> => {
    const request = ctx.switchToHttp().getRequest();
    return { id: request.user?.id, role: request.user?.role };
  },
);