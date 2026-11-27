import { BadRequestException, HttpStatus } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/** One problem tied to one request field; lets clients show it under the right input. */
export interface FieldError {
  field: string;
  message: string;
}

/** class-validator reports a forbidden extra property (whitelist) under this constraint key. */
const FORBIDDEN_PROPERTY_KEY = 'whitelistValidation';

function toFieldErrors(errors: ValidationError[], parent = ''): FieldError[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const constraints = Object.entries(error.constraints ?? {});
    const nested = toFieldErrors(error.children ?? [], field);
    if (constraints.length === 0) return nested;
    const [key, message] = constraints[0];
    return [
      { field, message: key === FORBIDDEN_PROPERTY_KEY ? `${field} is not allowed` : message },
      ...nested,
    ];
  });
}

export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  return new BadRequestException({
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Validation failed',
    errors: toFieldErrors(errors),
  });
}
