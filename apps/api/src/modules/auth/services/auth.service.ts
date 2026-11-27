import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import type { UserEntity } from '../../users/entities/user.entity.js';
import { EmailAlreadyExistsError } from '../../users/errors/email-already-exists.error.js';
import { UsersService } from '../../users/users.service.js';
import type { SignInDto } from '../dto/signin.dto.js';
import type { SignUpDto } from '../dto/signup.dto.js';
import { HashingService } from './hashing.service.js';
import { AuthTokens, TokenService } from './token.service.js';

export interface AuthResult {
  user: UserEntity;
  tokens: AuthTokens;
}

const EMAIL_TAKEN_MESSAGE = 'Email is already registered';

@Injectable()
export class AuthService implements OnModuleInit {
  /** Verified against when the email is unknown, so "no such user" costs the same time. */
  private dummyHash = '';

  constructor(
    private readonly users: UsersService,
    private readonly hashing: HashingService,
    private readonly tokens: TokenService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hashing.hash(randomUUID());
  }

  async signUp(dto: SignUpDto): Promise<AuthResult> {
    const passwordHash = await this.hashing.hash(dto.password);
    let user: UserEntity;
    try {
      user = await this.users.create({ email: dto.email, name: dto.name, passwordHash });
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        throw new ConflictException({
          message: EMAIL_TAKEN_MESSAGE,
          errors: [{ field: 'email', message: EMAIL_TAKEN_MESSAGE }],
        });
      }
      throw error;
    }
    return this.startSession(user);
  }

  async signIn(dto: SignInDto): Promise<AuthResult> {
    const found = await this.users.findByEmailWithPassword(dto.email);
    // Always run one argon2 verify, whether or not the user exists (timing), and use one message
    // for both failures (no account enumeration).
    const passwordMatches = await this.hashing.verify(
      found?.passwordHash ?? this.dummyHash,
      dto.password,
    );
    if (!found || !passwordMatches) throw new UnauthorizedException('Invalid email or password');

    const { passwordHash: _passwordHash, ...user } = found;
    return this.startSession(user);
  }

  /**
   * Rotates the pair. A refresh token that is valid but doesn't match the stored hash was already
   * used (or the session was ended): treat it as theft and kill the session.
   */
  async refresh(refreshToken: string | undefined): Promise<AuthTokens> {
    if (!refreshToken) throw new UnauthorizedException();
    const { sub: userId } = await this.tokens.verifyRefresh(refreshToken);

    const storedHash = await this.users.getRefreshTokenHash(userId);
    if (!storedHash || !this.tokens.matchesRefreshHash(refreshToken, storedHash)) {
      return this.revokeSession(userId);
    }

    const next = await this.issueTokens(userId);
    // Compare-and-set: if a concurrent request already rotated, we lose and treat it as reuse.
    const swapped = await this.users.replaceRefreshTokenHash(userId, storedHash, next.refreshHash);
    if (!swapped) return this.revokeSession(userId);

    return next.tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.users.setRefreshTokenHash(userId, null);
  }

  private async startSession(user: UserEntity): Promise<AuthResult> {
    const { tokens, refreshHash } = await this.issueTokens(user.id);
    await this.users.setRefreshTokenHash(user.id, refreshHash);
    return { user, tokens };
  }

  private async issueTokens(userId: string): Promise<{ tokens: AuthTokens; refreshHash: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.signAccess(userId),
      this.tokens.signRefresh(userId),
    ]);
    return {
      tokens: { accessToken, refreshToken },
      refreshHash: this.tokens.hashRefreshToken(refreshToken),
    };
  }

  private async revokeSession(userId: string): Promise<never> {
    await this.users.setRefreshTokenHash(userId, null);
    throw new UnauthorizedException();
  }
}
