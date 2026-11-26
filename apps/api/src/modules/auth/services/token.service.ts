import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../../../config/app-config.service.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AccessPayload {
  sub: string;
}

export interface RefreshPayload extends AccessPayload {
  jti: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  signAccess(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId } satisfies AccessPayload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_TTL_SECONDS'),
    });
  }

  /** `jti` makes every refresh token unique, even two signed in the same second. */
  signRefresh(userId: string): Promise<string> {
    return this.jwt.signAsync({ sub: userId, jti: randomUUID() } satisfies RefreshPayload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_TTL_SECONDS'),
    });
  }

  async verifyAccess(token: string): Promise<AccessPayload> {
    const payload = await this.verify(token, this.config.get('JWT_ACCESS_SECRET'));
    return { sub: payload.sub };
  }

  async verifyRefresh(token: string): Promise<RefreshPayload> {
    const payload = await this.verify(token, this.config.get('JWT_REFRESH_SECRET'));
    if (typeof payload.jti !== 'string') throw new UnauthorizedException();
    return { sub: payload.sub, jti: payload.jti };
  }

  /**
   * SHA-256 is enough here: the refresh token is a long random signed value, so there is nothing
   * to brute-force. Slow hashing (argon2) is for low-entropy passwords.
   */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Constant-time comparison so response timing doesn't leak how much of the hash matched. */
  matchesRefreshHash(token: string, storedHash: string): boolean {
    const actual = Buffer.from(this.hashRefreshToken(token), 'hex');
    const expected = Buffer.from(storedHash, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private async verify(token: string, secret: string): Promise<{ sub: string; jti?: unknown }> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown; jti?: unknown }>(token, {
        secret,
      });
      if (typeof payload.sub !== 'string') throw new UnauthorizedException();
      return { sub: payload.sub, jti: payload.jti };
    } catch {
      throw new UnauthorizedException();
    }
  }
}
