import { PASSWORD_RULE_MESSAGE, signInSchema, signUpSchema } from './schemas';

const valid = { email: 'jane@example.com', name: 'Jane Doe', password: 'S3cure!pass' };

function messagesFor(input: Record<string, unknown>) {
  const result = signUpSchema.safeParse({ ...valid, ...input });
  return result.success
    ? []
    : result.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`);
}

describe('signUpSchema', () => {
  it('accepts valid input', () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it('trims and lowercases email, trims name, and does NOT trim the password', () => {
    const result = signUpSchema.parse({
      email: '  Jane@Example.COM ',
      name: '  Jane Doe ',
      password: ' S3cure!pass ',
    });
    expect(result).toEqual({
      email: 'jane@example.com',
      name: 'Jane Doe',
      password: ' S3cure!pass ',
    });
  });

  it.each([
    ['email without @', { email: 'jane.example.com' }, 'email: Enter a valid email address'],
    ['empty email', { email: '   ' }, 'email: Email is required'],
    [
      'email over 254 chars',
      { email: `${'a'.repeat(250)}@x.com` },
      'email: Email must be at most 254 characters',
    ],
    ['name under 3 chars', { name: 'Jo' }, 'name: Name must be at least 3 characters'],
    ['name of only spaces', { name: '   ' }, 'name: Name must be at least 3 characters'],
    ['name over 50 chars', { name: 'a'.repeat(51) }, 'name: Name must be at most 50 characters'],
    [
      'password under 8 chars',
      { password: 'S3c!ure' },
      'password: Password must be at least 8 characters',
    ],
    [
      'password over 64 chars',
      { password: `S3!${'a'.repeat(62)}` },
      'password: Password must be at most 64 characters',
    ],
    ['password without a letter', { password: '12345678!' }, `password: ${PASSWORD_RULE_MESSAGE}`],
    ['password without a number', { password: 'Password!' }, `password: ${PASSWORD_RULE_MESSAGE}`],
    [
      'password without a special char',
      { password: 'Password1' },
      `password: ${PASSWORD_RULE_MESSAGE}`,
    ],
    [
      'Arabic letters and digits only',
      { password: 'كلمةسر١٢٣٤' },
      `password: ${PASSWORD_RULE_MESSAGE}`,
    ],
  ])('rejects %s', (_label, override, message) => {
    expect(messagesFor(override)[0]).toBe(message);
  });

  it('accepts the 8 and 64 character boundaries', () => {
    expect(messagesFor({ password: 'S3cure!p' })).toEqual([]);
    expect(messagesFor({ password: `S3!${'a'.repeat(61)}` })).toEqual([]);
  });

  it('accepts Arabic letters with a digit and a symbol', () => {
    expect(messagesFor({ password: 'كلمةسر1!' })).toEqual([]);
  });

  it('reports length before complexity, like the API', () => {
    expect(messagesFor({ password: 'abc' })[0]).toBe(
      'password: Password must be at least 8 characters',
    );
  });
});

describe('signInSchema', () => {
  it('has no complexity rule', () => {
    expect(signInSchema.safeParse({ email: 'jane@example.com', password: 'simple' }).success).toBe(
      true,
    );
  });

  it('requires a password and caps its length', () => {
    expect(signInSchema.safeParse({ email: 'jane@example.com', password: '' }).success).toBe(false);
    expect(
      signInSchema.safeParse({ email: 'jane@example.com', password: 'a'.repeat(65) }).success,
    ).toBe(false);
  });

  it('normalises the email', () => {
    expect(signInSchema.parse({ email: ' Jane@Example.com ', password: 'x' }).email).toBe(
      'jane@example.com',
    );
  });
});
