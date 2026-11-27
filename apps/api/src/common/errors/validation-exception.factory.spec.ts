import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SignUpDto } from '../../modules/auth/dto/signup.dto.js';
import { validationExceptionFactory } from './validation-exception.factory.js';

async function bodyFor(input: Record<string, unknown>) {
  const errors = await validate(plainToInstance(SignUpDto, input), {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return validationExceptionFactory(errors).getResponse();
}

const valid = { email: 'jane@example.com', name: 'Jane Doe', password: 'S3cure!pass' };

describe('validationExceptionFactory', () => {
  it('returns one message plus a field error per invalid field', async () => {
    expect(await bodyFor({ email: 'x', name: 'Jo', password: 'S3cure!pass' })).toMatchObject({
      statusCode: 400,
      message: 'Validation failed',
      errors: [
        { field: 'email', message: 'Enter a valid email address' },
        { field: 'name', message: 'Name must be at least 3 characters' },
      ],
    });
  });

  it('reports only the first failed rule, in the same order as the web schema', async () => {
    // "abc" fails both the length and the complexity rule: length is reported first.
    expect(await bodyFor({ ...valid, password: 'abc' })).toMatchObject({
      errors: [{ field: 'password', message: 'Password must be at least 8 characters' }],
    });
  });

  it('turns a forbidden extra field into "<field> is not allowed"', async () => {
    expect(await bodyFor({ ...valid, role: 'admin' })).toMatchObject({
      errors: [{ field: 'role', message: 'role is not allowed' }],
    });
  });
});
