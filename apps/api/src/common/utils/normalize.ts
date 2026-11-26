import type { TransformFnParams } from 'class-transformer';

/** `@Transform` helper: trims strings, leaves other types for the validators to reject. */
export const trim = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** `@Transform` helper for emails: trim + lowercase so `A@x.com` and `a@x.com` are one account. */
export const trimAndLowercase = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;
