import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { Argon2HashingService } from './services/argon2-hashing.service.js';
import { AuthService } from './services/auth.service.js';
import { HashingService } from './services/hashing.service.js';
import { TokenService } from './services/token.service.js';

@Module({
  // No default secret: each sign/verify passes its own, so access and refresh can't be mixed up.
  imports: [UsersModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    { provide: HashingService, useClass: Argon2HashingService },
  ],
  exports: [TokenService],
})
export class AuthModule {}
