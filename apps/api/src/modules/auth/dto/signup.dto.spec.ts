import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SignUpDto } from './signup.dto.js';

const valid = { email: 'jane@example.com', name: 'Jane Doe', password: 'S3cure!pass' };

async function errorsFor(input: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(SignUpDto, input);
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return errors.map((e) => e.property);
}

describe('SignUpDto', () => {
  it('accepts valid input', async () => {
    expect(await errorsFor(valid)).toEqual([]);
  });

  it('trims and lowercases email, trims name, keeps password untouched', () => {
    const dto = plainToInstance(SignUpDto, {
      email: '  Jane@Example.COM ',
      name: '  Jane Doe ',
      password: ' S3cure!pass ',
    });
    expect(dto).toMatchObject({
      email: 'jane@example.com',
      name: 'Jane Doe',
      password: ' S3cure!pass ',
    });
  });

  it.each([
    ['email without @', { email: 'jane.example.com' }, 'email'],
    ['email over 254 chars', { email: `${'a'.repeat(250)}@x.com` }, 'email'],
    ['missing email', { email: undefined }, 'email'],
    ['name under 3 chars', { name: 'Jo' }, 'name'],
    ['name that is 3 chars of spaces', { name: '   ' }, 'name'],
    ['name over 50 chars', { name: 'a'.repeat(51) }, 'name'],
    ['password under 8 chars', { password: 'S3c!ure' }, 'password'],
    ['password over 64 chars', { password: `S3!${'a'.repeat(62)}` }, 'password'],
    ['password without a letter', { password: '12345678!' }, 'password'],
    ['password without a number', { password: 'Password!' }, 'password'],
    ['password without a special char', { password: 'Password1' }, 'password'],
    ['non-string password', { password: 12345678 }, 'password'],
  ])('rejects %s', async (_label, override, property) => {
    expect(await errorsFor({ ...valid, ...override })).toContain(property);
  });

  it('accepts password at the 8 and 64 char boundaries', async () => {
    expect(await errorsFor({ ...valid, password: 'S3cure!p' })).toEqual([]);
    expect(await errorsFor({ ...valid, password: `S3!${'a'.repeat(61)}` })).toEqual([]);
  });

  it('accepts Arabic letters with a digit and a symbol', async () => {
    expect(await errorsFor({ ...valid, password: 'كلمةسر1!' })).toEqual([]);
  });

  it('rejects Arabic letters and digits without a symbol', async () => {
    expect(await errorsFor({ ...valid, password: 'كلمةسر١٢٣٤' })).toContain('password');
  });

  it('rejects unknown fields such as role', async () => {
    expect(await errorsFor({ ...valid, role: 'admin' })).toContain('role');
  });
});
