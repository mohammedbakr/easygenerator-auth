import { z } from 'zod';

// Mirrors apps/api/src/common/constants/validation.constants.ts exactly.
export const EMAIL_MAX_LENGTH = 254;
export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 50;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_REGEX = /^(?=.*\p{L})(?=.*\p{N})(?=.*[^\p{L}\p{N}]).+$/u;
export const PASSWORD_RULE_MESSAGE =
  'Password must contain at least one letter, one number and one special character';

// trim + lowercase run first, so the checks below see the normalised value (same as the API DTO).
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(
    z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address')
      .max(EMAIL_MAX_LENGTH, `Email must be at most ${EMAIL_MAX_LENGTH} characters`),
  );

export const signUpSchema = z.object({
  email,
  name: z
    .string()
    .trim()
    .min(NAME_MIN_LENGTH, `Name must be at least ${NAME_MIN_LENGTH} characters`)
    .max(NAME_MAX_LENGTH, `Name must be at most ${NAME_MAX_LENGTH} characters`),
  // Not trimmed: spaces are legitimate password characters.
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
    .regex(PASSWORD_REGEX, PASSWORD_RULE_MESSAGE),
});

// Sign-in has no complexity rule: it must not reveal the rules or reject older passwords.
export const signInSchema = z.object({
  email,
  password: z
    .string()
    .min(1, 'Password is required')
    .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`),
});

export type SignUpValues = z.infer<typeof signUpSchema>;
export type SignInValues = z.infer<typeof signInSchema>;
