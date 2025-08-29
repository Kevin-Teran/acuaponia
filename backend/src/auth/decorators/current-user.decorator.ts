/**
 * @file current-user.decorator.ts
 * @description Decorador para extraer el usuario autenticado del request
 * @author Kevin
 * @since 1.0.0
 */
 import { createParamDecorator, ExecutionContext } from '@nestjs/common';
 import { User } from '@prisma/client';
 
 export const CurrentUser = createParamDecorator(
   (data: unknown, ctx: ExecutionContext): Pick<User, 'id' | 'role'> => {
     const request = ctx.switchToHttp().getRequest();
     return { id: request.user?.id, role: request.user?.role };
   },
 );
 