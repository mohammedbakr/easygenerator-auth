import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import {
  EMAIL_INVALID_MESSAGE,
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_REQUIRED_MESSAGE,
} from '../../../common/constants/validation.constants.js';
import { trimAndLowercase } from '../../../common/utils/normalize.js';

/** No complexity rules here: sign-in must only check the credentials, not teach the password policy. */
export class SignInDto {
  @ApiProperty({ example: 'jane@example.com', maxLength: EMAIL_MAX_LENGTH })
  @Transform(trimAndLowercase)
  @IsEmail({}, { message: EMAIL_INVALID_MESSAGE })
  @MaxLength(EMAIL_MAX_LENGTH, { message: `Email must be at most ${EMAIL_MAX_LENGTH} characters` })
  email: string;

  @ApiProperty({ example: 'S3cure!pass', maxLength: PASSWORD_MAX_LENGTH })
  @IsString({ message: PASSWORD_REQUIRED_MESSAGE })
  @IsNotEmpty({ message: PASSWORD_REQUIRED_MESSAGE })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
  })
  password: string;
}
