import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { SignUpDto } from './dto/signup.dto.js';
import { AuthService } from './services/auth.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: UserResponseDto })
  @ApiConflictResponse({ description: 'Email is already registered' })
  async signUp(@Body() dto: SignUpDto): Promise<UserResponseDto> {
    return UserResponseDto.from(await this.auth.signUp(dto));
  }
}
