import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ACCESS_COOKIE } from '../../modules/auth/auth.cookies.js';
import { TokenService } from '../../modules/auth/services/token.service.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/** Registered globally: every route needs a valid access cookie unless marked `@Public()`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const cookie: unknown = request.cookies?.[ACCESS_COOKIE];
    if (typeof cookie !== 'string') throw new UnauthorizedException();

    const { sub } = await this.tokens.verifyAccess(cookie);
    request.user = { id: sub };
    return true;
  }
}
