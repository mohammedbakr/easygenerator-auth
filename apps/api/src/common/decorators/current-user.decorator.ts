import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../types/auth-user.js';

/** Injects the user set by `JwtAuthGuard`. Only valid on non-public routes. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const { user } = ctx.switchToHttp().getRequest<Request>();
    if (!user) throw new UnauthorizedException();
    return user;
  },
);
