export const EMAIL_MAX_LENGTH = 254;

export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 50;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 64;
/** At least one letter, one number and one special (non-alphanumeric) character. */
export const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
export const PASSWORD_RULE_MESSAGE =
  'Password must contain at least one letter, one number and one special character';
