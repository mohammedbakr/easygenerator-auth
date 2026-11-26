import { ConflictException, Injectable } from '@nestjs/common';
import { EmailAlreadyExistsError } from '../../users/errors/email-already-exists.error.js';
import type { UserEntity } from '../../users/entities/user.entity.js';
import { UsersService } from '../../users/users.service.js';
import type { SignUpDto } from '../dto/signup.dto.js';
import { HashingService } from './hashing.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly hashing: HashingService,
  ) {}

  async signUp(dto: SignUpDto): Promise<UserEntity> {
    const passwordHash = await this.hashing.hash(dto.password);
    try {
      return await this.users.create({ email: dto.email, name: dto.name, passwordHash });
    } catch (error) {
      if (error instanceof EmailAlreadyExistsError) {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
  }
}
