import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { StrictThrottle } from '../../common/decorators/strict-throttle.decorator.js';
import type { AuthUser } from '../../common/types/auth-user.js';
import { AppConfigService } from '../../config/app-config.service.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import {
  AuthCookieConfig,
  clearAuthCookies,
  REFRESH_COOKIE,
  setAuthCookies,
} from './auth.cookies.js';
import { SignInDto } from './dto/signin.dto.js';
import { SignUpDto } from './dto/signup.dto.js';
import { AuthService } from './services/auth.service.js';

/** HTTP only: DTOs in, cookies and status codes out. The rules live in AuthService. */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieConfig: AuthCookieConfig;

  constructor(
    private readonly auth: AuthService,
    config: AppConfigService,
  ) {
    this.cookieConfig = {
      secure: config.isProduction,
      accessTtlSeconds: config.get('JWT_ACCESS_TTL_SECONDS'),
      refreshTtlSeconds: config.get('JWT_REFRESH_TTL_SECONDS'),
    };
  }

  @Public()
  @StrictThrottle()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: UserResponseDto, description: 'Account created, cookies set' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({ description: 'Email is already registered' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  async signUp(
    @Body() dto: SignUpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user, tokens } = await this.auth.signUp(dto);
    setAuthCookies(res, tokens, this.cookieConfig);
    return UserResponseDto.from(user);
  }

  @Public()
  @StrictThrottle()
  @Post('signin')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: UserResponseDto, description: 'Signed in, cookies set' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password' })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts' })
  async signIn(
    @Body() dto: SignInDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<UserResponseDto> {
    const { user, tokens } = await this.auth.signIn(dto);
    setAuthCookies(res, tokens, this.cookieConfig);
    return UserResponseDto.from(user);
  }

  /** Public because the access token may already have expired; it authenticates by refresh cookie. */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Tokens rotated, new cookies set' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid or reused refresh token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const cookie: unknown = req.cookies?.[REFRESH_COOKIE];
    try {
      const tokens = await this.auth.refresh(typeof cookie === 'string' ? cookie : undefined);
      setAuthCookies(res, tokens, this.cookieConfig);
    } catch (error) {
      // The one place a controller catches: a failed refresh must also remove the dead cookies.
      clearAuthCookies(res, this.cookieConfig);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiCookieAuth('access_token')
  @ApiNoContentResponse({ description: 'Session ended, cookies cleared' })
  @ApiUnauthorizedResponse({ description: 'Not signed in' })
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(user.id);
    clearAuthCookies(res, this.cookieConfig);
  }
}
