import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  EMAIL_INVALID_MESSAGE,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  NAME_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  PASSWORD_RULE_MESSAGE,
} from '../../../common/constants/validation.constants.js';
import { trim, trimAndLowercase } from '../../../common/utils/normalize.js';

export class SignUpDto {
  @ApiProperty({ example: 'jane@example.com', maxLength: EMAIL_MAX_LENGTH })
  @Transform(trimAndLowercase)
  @IsEmail({}, { message: EMAIL_INVALID_MESSAGE })
  @MaxLength(EMAIL_MAX_LENGTH, { message: `Email must be at most ${EMAIL_MAX_LENGTH} characters` })
  email: string;

  @ApiProperty({ example: 'Jane Doe', minLength: NAME_MIN_LENGTH, maxLength: NAME_MAX_LENGTH })
  @Transform(trim)
  @IsString({ message: `Name must be at least ${NAME_MIN_LENGTH} characters` })
  @MinLength(NAME_MIN_LENGTH, { message: `Name must be at least ${NAME_MIN_LENGTH} characters` })
  @MaxLength(NAME_MAX_LENGTH, { message: `Name must be at most ${NAME_MAX_LENGTH} characters` })
  name: string;

  @ApiProperty({
    example: 'S3cure!pass',
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
    description: PASSWORD_RULE_MESSAGE,
  })
  // class-validator runs decorators bottom-up and the API reports the first failure, so this list is
  // reversed on purpose: checks run IsString, MinLength, MaxLength, Matches, like the web schema.
  @Matches(PASSWORD_REGEX, { message: PASSWORD_RULE_MESSAGE })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters`,
  })
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters`,
  })
  @IsString({ message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` })
  password: string;
}
