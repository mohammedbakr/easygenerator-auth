import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { Argon2HashingService } from './services/argon2-hashing.service.js';
import { AuthService } from './services/auth.service.js';
import { HashingService } from './services/hashing.service.js';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService, { provide: HashingService, useClass: Argon2HashingService }],
})
export class AuthModule {}
