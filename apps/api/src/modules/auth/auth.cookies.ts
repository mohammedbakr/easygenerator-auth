import type { CookieOptions, Response } from 'express';
import type { AuthTokens } from './services/token.service.js';

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

// The refresh cookie is only sent to /api/auth/*, so ordinary API calls never carry it.
const ACCESS_PATH = '/api';
const REFRESH_PATH = '/api/auth';

export interface AuthCookieConfig {
  secure: boolean;
  accessTtlSeconds: number;
  refreshTtlSeconds: number;
}

/** httpOnly: JavaScript can't read it. SameSite=Strict: never sent on cross-site requests. */
function baseOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'strict', secure };
}

export function setAuthCookies(res: Response, tokens: AuthTokens, config: AuthCookieConfig): void {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(config.secure),
    path: ACCESS_PATH,
    maxAge: config.accessTtlSeconds * 1000,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(config.secure),
    path: REFRESH_PATH,
    maxAge: config.refreshTtlSeconds * 1000,
  });
}

/** Name + path must match the originals, otherwise the browser keeps the cookie. */
export function clearAuthCookies(res: Response, config: Pick<AuthCookieConfig, 'secure'>): void {
  res.clearCookie(ACCESS_COOKIE, { ...baseOptions(config.secure), path: ACCESS_PATH });
  res.clearCookie(REFRESH_COOKIE, { ...baseOptions(config.secure), path: REFRESH_PATH });
}
