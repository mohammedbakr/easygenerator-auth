import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { EmailAlreadyExistsError } from '../../users/errors/email-already-exists.error.js';
import type { UserWithPassword } from '../../users/entities/user.entity.js';
import type { UsersService } from '../../users/users.service.js';
import { AuthService } from './auth.service.js';
import type { HashingService } from './hashing.service.js';
import type { TokenService } from './token.service.js';

const user = {
  id: 'user-1',
  email: 'jane@example.com',
  name: 'Jane Doe',
  createdAt: new Date('2026-01-01'),
};
const userWithPassword: UserWithPassword = { ...user, passwordHash: 'hashed:S3cure!pass' };
const signUpDto = { email: user.email, name: user.name, password: 'S3cure!pass' };
const signInDto = { email: user.email, password: 'S3cure!pass' };

/** Fakes for the three collaborators; hashing is a transparent "hashed:" prefix. */
async function setup() {
  const users = {
    create: vi.fn(),
    findByEmailWithPassword: vi.fn(),
    getRefreshTokenHash: vi.fn(),
    setRefreshTokenHash: vi.fn().mockResolvedValue(undefined),
    replaceRefreshTokenHash: vi.fn(),
  };
  const hashing = {
    hash: vi.fn((plain: string) => Promise.resolve(`hashed:${plain}`)),
    verify: vi.fn((hash: string, plain: string) => Promise.resolve(hash === `hashed:${plain}`)),
  };
  const tokens = {
    signAccess: vi.fn().mockResolvedValue('access'),
    signRefresh: vi.fn().mockResolvedValue('refresh-new'),
    verifyRefresh: vi.fn(),
    hashRefreshToken: vi.fn((token: string) => `sha:${token}`),
    matchesRefreshHash: vi.fn((token: string, stored: string) => stored === `sha:${token}`),
  };
  const service = new AuthService(
    users as unknown as UsersService,
    hashing as unknown as HashingService,
    tokens as unknown as TokenService,
  );
  await service.onModuleInit();
  return { service, users, hashing, tokens };
}

describe('AuthService', () => {
  describe('signUp', () => {
    it('hashes the password and never stores it in plain text', async () => {
      const { service, users, hashing } = await setup();
      users.create.mockResolvedValue(user);

      await service.signUp(signUpDto);

      expect(hashing.hash).toHaveBeenCalledWith('S3cure!pass');
      expect(users.create).toHaveBeenCalledWith({
        email: user.email,
        name: user.name,
        passwordHash: 'hashed:S3cure!pass',
      });
    });

    it('returns a safe user, issues tokens and stores only the refresh hash', async () => {
      const { service, users } = await setup();
      users.create.mockResolvedValue(user);

      const result = await service.signUp(signUpDto);

      expect(result.user).toEqual(user);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.tokens).toEqual({ accessToken: 'access', refreshToken: 'refresh-new' });
      expect(users.setRefreshTokenHash).toHaveBeenCalledWith(user.id, 'sha:refresh-new');
    });

    it('maps a duplicate email to 409 Conflict', async () => {
      const { service, users } = await setup();
      users.create.mockRejectedValue(new EmailAlreadyExistsError());

      const attempt = service.signUp(signUpDto);

      await expect(attempt).rejects.toBeInstanceOf(ConflictException);
      await expect(attempt).rejects.toThrow('Email is already registered');
    });

    it('rethrows unexpected errors untouched', async () => {
      const { service, users } = await setup();
      const boom = new Error('db down');
      users.create.mockRejectedValue(boom);

      await expect(service.signUp(signUpDto)).rejects.toBe(boom);
    });
  });

  describe('signIn', () => {
    it('returns the user without the password hash and starts a session', async () => {
      const { service, users } = await setup();
      users.findByEmailWithPassword.mockResolvedValue(userWithPassword);

      const result = await service.signIn(signInDto);

      expect(result.user).toEqual(user);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(users.setRefreshTokenHash).toHaveBeenCalledWith(user.id, 'sha:refresh-new');
    });

    it('rejects a wrong password with 401 "Invalid email or password"', async () => {
      const { service, users } = await setup();
      users.findByEmailWithPassword.mockResolvedValue(userWithPassword);

      const attempt = service.signIn({ ...signInDto, password: 'Wrong!pass1' });

      await expect(attempt).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(attempt).rejects.toThrow('Invalid email or password');
      expect(users.setRefreshTokenHash).not.toHaveBeenCalled();
    });

    it('rejects an unknown email with the same 401, after verifying against a dummy hash', async () => {
      const { service, users, hashing } = await setup();
      users.findByEmailWithPassword.mockResolvedValue(null);

      const attempt = service.signIn(signInDto);

      await expect(attempt).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(attempt).rejects.toThrow('Invalid email or password');
      // The dummy verify keeps response time the same as for a real account.
      expect(hashing.verify).toHaveBeenCalledWith(expect.stringMatching(/^hashed:/), 'S3cure!pass');
    });
  });

  describe('refresh', () => {
    const storedHash = 'sha:refresh-old';

    it('rejects a missing token without touching the database', async () => {
      const { service, tokens, users } = await setup();

      await expect(service.refresh(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
      expect(tokens.verifyRefresh).not.toHaveBeenCalled();
      expect(users.setRefreshTokenHash).not.toHaveBeenCalled();
    });

    it('rejects an invalid or expired token', async () => {
      const { service, tokens } = await setup();
      tokens.verifyRefresh.mockRejectedValue(new UnauthorizedException());

      await expect(service.refresh('garbage')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rotates the pair when the token matches the stored hash', async () => {
      const { service, users, tokens } = await setup();
      tokens.verifyRefresh.mockResolvedValue({ sub: user.id, jti: 'j' });
      users.getRefreshTokenHash.mockResolvedValue(storedHash);
      users.replaceRefreshTokenHash.mockResolvedValue(true);

      const result = await service.refresh('refresh-old');

      expect(result).toEqual({ accessToken: 'access', refreshToken: 'refresh-new' });
      expect(users.replaceRefreshTokenHash).toHaveBeenCalledWith(
        user.id,
        storedHash,
        'sha:refresh-new',
      );
    });

    it('treats a hash mismatch as reuse: clears the stored hash and returns 401', async () => {
      const { service, users, tokens } = await setup();
      tokens.verifyRefresh.mockResolvedValue({ sub: user.id, jti: 'j' });
      users.getRefreshTokenHash.mockResolvedValue('sha:some-newer-token');

      await expect(service.refresh('refresh-old')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(users.setRefreshTokenHash).toHaveBeenCalledWith(user.id, null);
      expect(users.replaceRefreshTokenHash).not.toHaveBeenCalled();
    });

    it('rejects a token for a session that was already ended (no stored hash)', async () => {
      const { service, users, tokens } = await setup();
      tokens.verifyRefresh.mockResolvedValue({ sub: user.id, jti: 'j' });
      users.getRefreshTokenHash.mockResolvedValue(null);

      await expect(service.refresh('refresh-old')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(users.setRefreshTokenHash).toHaveBeenCalledWith(user.id, null);
    });

    it('loses a concurrent rotation race: 401 and the session is revoked', async () => {
      const { service, users, tokens } = await setup();
      tokens.verifyRefresh.mockResolvedValue({ sub: user.id, jti: 'j' });
      users.getRefreshTokenHash.mockResolvedValue(storedHash);
      // Another request swapped the hash between our read and our compare-and-set.
      users.replaceRefreshTokenHash.mockResolvedValue(false);

      await expect(service.refresh('refresh-old')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(users.setRefreshTokenHash).toHaveBeenCalledWith(user.id, null);
    });
  });

  describe('logout', () => {
    it('clears the stored refresh hash', async () => {
      const { service, users } = await setup();

      await service.logout(user.id);

      expect(users.setRefreshTokenHash).toHaveBeenCalledWith(user.id, null);
    });
  });
});
