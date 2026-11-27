// Messages mirror the web zod schemas, so server errors read the same as client ones.
export const EMAIL_INVALID_MESSAGE = 'Enter a valid email address';
export const PASSWORD_REQUIRED_MESSAGE = 'Password is required';

export const EMAIL_MAX_LENGTH = 254;

export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 50;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
/**
 * At least one letter, one number and one special character. Unicode-aware: letters and digits from
 * any script count, and "special" means anything that is neither a letter nor a digit.
 * The web zod schema must mirror this exact regex.
 */
export const PASSWORD_REGEX = /^(?=.*\p{L})(?=.*\p{N})(?=.*[^\p{L}\p{N}]).+$/u;
export const PASSWORD_RULE_MESSAGE =
  'Password must contain at least one letter, one number and one special character';
