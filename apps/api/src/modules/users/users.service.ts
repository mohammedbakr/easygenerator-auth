import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { UserEntity, UserWithPassword } from './entities/user.entity.js';
import { UsersRepository } from './users.repository.js';

/** The only entry point other modules use to reach user data. */
@Injectable()
export class UsersService {
  constructor(private readonly repository: UsersRepository) {}

  create(data: { email: string; name: string; passwordHash: string }): Promise<UserEntity> {
    return this.repository.create(data);
  }

  findByEmailWithPassword(email: string): Promise<UserWithPassword | null> {
    return this.repository.findByEmailWithPassword(email);
  }

  /** A valid token for a user that no longer exists must not be accepted. */
  async getProfile(id: string): Promise<UserEntity> {
    const user = await this.repository.findById(id);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  getRefreshTokenHash(id: string): Promise<string | null> {
    return this.repository.findRefreshTokenHash(id);
  }

  setRefreshTokenHash(id: string, hash: string | null): Promise<void> {
    return this.repository.setRefreshTokenHash(id, hash);
  }

  replaceRefreshTokenHash(id: string, expectedHash: string, newHash: string): Promise<boolean> {
    return this.repository.replaceRefreshTokenHash(id, expectedHash, newHash);
  }
}
