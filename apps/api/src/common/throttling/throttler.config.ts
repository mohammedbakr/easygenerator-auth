import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ThrottlerModuleOptions } from '@nestjs/throttler';
import type { AppConfigService } from '../../config/app-config.service.js';
import { STRICT_THROTTLE_KEY } from '../decorators/strict-throttle.decorator.js';

const WINDOW_MS = 60_000;
const reflector = new Reflector();

/**
 * Two buckets per client IP:
 * - `default`: every route.
 * - `auth`: only routes marked `@StrictThrottle()` (sign-up, sign-in), to slow password guessing.
 * Limits come from env so tests can raise them instead of hitting 429 by accident.
 */
export function createThrottlerOptions(config: AppConfigService): ThrottlerModuleOptions {
  return {
    errorMessage: 'Too many requests, please try again in a minute',
    throttlers: [
      { name: 'default', ttl: WINDOW_MS, limit: config.get('RATE_LIMIT_PER_MINUTE') },
      {
        name: 'auth',
        ttl: WINDOW_MS,
        limit: config.get('AUTH_RATE_LIMIT_PER_MINUTE'),
        skipIf: (context: ExecutionContext) =>
          !reflector.get<boolean | undefined>(STRICT_THROTTLE_KEY, context.getHandler()),
      },
    ],
  };
}
