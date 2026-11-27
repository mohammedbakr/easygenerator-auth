import { validateEnv } from './env.schema.js';

const valid = {
  MONGO_URI: 'mongodb://localhost:27017/test',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  CORS_ORIGIN: 'http://localhost:5173',
};

describe('validateEnv', () => {
  it('applies defaults', () => {
    expect(validateEnv(valid)).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      JWT_ACCESS_TTL_SECONDS: 900,
      JWT_REFRESH_TTL_SECONDS: 604800,
      RATE_LIMIT_PER_MINUTE: 100,
      AUTH_RATE_LIMIT_PER_MINUTE: 5,
      TRUST_PROXY: false,
      COOKIE_SECURE: false,
    });
  });

  it('defaults COOKIE_SECURE to true in production', () => {
    expect(validateEnv({ ...valid, NODE_ENV: 'production' }).COOKIE_SECURE).toBe(true);
  });

  it('lets COOKIE_SECURE and TRUST_PROXY be set explicitly', () => {
    expect(
      validateEnv({
        ...valid,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'false',
        TRUST_PROXY: 'true',
      }),
    ).toMatchObject({ COOKIE_SECURE: false, TRUST_PROXY: true });
  });

  it.each([
    ['missing MONGO_URI', { ...valid, MONGO_URI: undefined }],
    ['short secret', { ...valid, JWT_ACCESS_SECRET: 'short' }],
    ['identical secrets', { ...valid, JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET }],
    ['bad CORS_ORIGIN', { ...valid, CORS_ORIGIN: 'not-a-url' }],
    ['non-numeric TTL', { ...valid, JWT_ACCESS_TTL_SECONDS: '15m' }],
    ['zero rate limit', { ...valid, AUTH_RATE_LIMIT_PER_MINUTE: 0 }],
    ['non-boolean TRUST_PROXY', { ...valid, TRUST_PROXY: 'yes' }],
    ['non-boolean COOKIE_SECURE', { ...valid, COOKIE_SECURE: '1' }],
    ['zero TTL', { ...valid, JWT_REFRESH_TTL_SECONDS: 0 }],
  ])('rejects %s', (_label, env) => {
    expect(() => validateEnv(env)).toThrow(/Invalid environment configuration/);
  });
});
