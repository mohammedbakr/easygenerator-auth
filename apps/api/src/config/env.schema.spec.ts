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
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_TTL: '7d',
    });
  });

  it.each([
    ['missing MONGO_URI', { ...valid, MONGO_URI: undefined }],
    ['short secret', { ...valid, JWT_ACCESS_SECRET: 'short' }],
    ['identical secrets', { ...valid, JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET }],
    ['bad CORS_ORIGIN', { ...valid, CORS_ORIGIN: 'not-a-url' }],
  ])('rejects %s', (_label, env) => {
    expect(() => validateEnv(env)).toThrow(/Invalid environment configuration/);
  });
});
