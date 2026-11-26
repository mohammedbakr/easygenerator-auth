import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
} from '../../../common/constants/validation.constants.js';
import { trimAndLowercase } from '../../../common/utils/normalize.js';

/** No complexity rules here: sign-in must only check the credentials, not teach the password policy. */
export class SignInDto {
  @ApiProperty({ example: 'jane@example.com', maxLength: EMAIL_MAX_LENGTH })
  @Transform(trimAndLowercase)
  @IsEmail()
  @MaxLength(EMAIL_MAX_LENGTH)
  email: string;

  @ApiProperty({ example: 'S3cure!pass', maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}
